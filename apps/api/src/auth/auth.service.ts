import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { SessionResponse, UserRole } from "@smart-rounding/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Environment } from "../config/environment.js";
import { DATABASE, type Database } from "../database/database.js";
import {
  hashPassword,
  hashToken,
  newSessionToken,
  verifyPassword,
} from "./passwords.js";
import type { AuthenticatedPrincipal } from "./auth.types.js";

export const SESSION_COOKIE = "sr_session";

const MINUTE = 60 * 1000;
/** Avoid a database write on every request: refresh activity at most this often. */
const TOUCH_INTERVAL_MS = MINUTE;

type SessionRow = {
  id: string;
  user_id: string;
  remember: boolean;
  last_seen_at: Date | string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  provider_id: string | null;
  must_change_password: boolean;
};

export type ResolvedSession = Readonly<{
  principal: AuthenticatedPrincipal;
  session: SessionResponse;
}>;

export type ClientInfo = Readonly<{
  ip?: string | null;
  userAgent?: string | null;
}>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject("ENVIRONMENT") private readonly environment: Environment,
    private readonly audit: AuditService,
  ) {}

  private assertEnabled(): void {
    if (this.environment.AUTH_MODE !== "local")
      throw new ServiceUnavailableException(
        "Identity provider is not configured",
      );
  }

  /** Absolute session lifetime: longer when the user asked to be remembered. */
  private lifetimeMs(remember: boolean): number {
    return remember
      ? this.environment.SESSION_REMEMBER_DAYS * 24 * 60 * MINUTE
      : this.environment.SESSION_MAX_HOURS * 60 * MINUTE;
  }

  private idleMs(): number {
    return this.environment.SESSION_IDLE_MINUTES * MINUTE;
  }

  async login(
    input: { email: string; password: string; mfa: string; remember: boolean },
    client: ClientInfo,
  ): Promise<{
    token: string;
    session: SessionResponse;
    maxAgeMs: number | null;
  }> {
    this.assertEnabled();
    const [user] = await this.db.query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      status: string;
      password_hash: string;
      locked_until: Date | string | null;
      must_change_password: boolean;
    }>(
      "SELECT id, name, email, role, status, password_hash, locked_until, must_change_password FROM users WHERE email = $1",
      [input.email.toLowerCase()],
    );
    const locked =
      !!user?.locked_until &&
      new Date(user.locked_until).getTime() > Date.now();
    const passwordOk =
      user && !locked
        ? await verifyPassword(input.password, user.password_hash)
        : false;
    // Stand-in for Keycloak MFA: a fixed code, accepted only with AUTH_MODE=local.
    const mfaOk = input.mfa === this.environment.DEV_MFA_CODE;
    if (!user || locked || !passwordOk || !mfaOk || user.status !== "ACTIVE") {
      // Count failures; lock the account for a while after too many in a row.
      if (user && !locked) await this.recordFailedPassword(user.id);
      await this.audit.record({
        actor: user?.name ?? "Unknown user",
        actorId: user?.id ?? null,
        eventType: "LOGIN",
        outcome: "DENIED",
        summary: locked
          ? "Login denied: account temporarily locked after repeated failures"
          : user && user.status !== "ACTIVE" && passwordOk
            ? "Login denied for a deactivated account"
            : "Login denied: incorrect email, password or MFA code",
        ip: client.ip ?? null,
      });
      // One message for every failure, so it never reveals which part was wrong.
      throw new UnauthorizedException(
        "The email, password, or MFA code is incorrect.",
      );
    }

    const { token, id } = newSessionToken();
    const now = Date.now();
    const lifetime = this.lifetimeMs(input.remember);
    await this.db.query(
      `INSERT INTO sessions (id, user_id, remember, created_at, last_seen_at, expires_at, ip, user_agent)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7)`,
      [
        id,
        user.id,
        input.remember,
        new Date(now),
        new Date(now + lifetime),
        client.ip ?? null,
        client.userAgent?.slice(0, 300) ?? null,
      ],
    );
    await this.db.query(
      "UPDATE users SET failed_logins = 0, locked_until = NULL, updated_at = now() WHERE id = $1",
      [user.id],
    );
    // Housekeeping: drop sessions that ended more than a day ago.
    await this.db.query(
      "DELETE FROM sessions WHERE expires_at < now() - interval '1 day' OR revoked_at < now() - interval '1 day'",
    );
    await this.audit.record({
      actor: user.name,
      actorId: user.id,
      eventType: "LOGIN",
      outcome: "SUCCESS",
      summary: input.remember ? "Signed in (remember me)" : "Signed in",
      ip: client.ip ?? null,
    });
    return {
      token,
      maxAgeMs: input.remember ? lifetime : null,
      session: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        idleExpiresAt: new Date(now + this.idleMs()).toISOString(),
        expiresAt: new Date(now + lifetime).toISOString(),
        idleTimeoutMinutes: this.environment.SESSION_IDLE_MINUTES,
        remember: input.remember,
        mustChangePassword: Boolean(user.must_change_password),
      },
    };
  }

  /**
   * Resolve a session token. Expired, idle, revoked or deactivated sessions
   * are rejected; a valid one counts as activity and extends the idle window.
   */
  async resolve(token: string | undefined): Promise<ResolvedSession> {
    this.assertEnabled();
    if (!token) throw new UnauthorizedException("Authentication is required");
    const [row] = await this.db.query<SessionRow>(
      `SELECT s.id, s.user_id, s.remember, s.last_seen_at, s.expires_at, s.revoked_at,
              u.name, u.email, u.role, u.status, u.provider_id, u.must_change_password
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = $1`,
      [hashToken(token)],
    );
    const now = Date.now();
    if (
      !row ||
      row.revoked_at ||
      row.status !== "ACTIVE" ||
      new Date(row.expires_at).getTime() <= now ||
      new Date(row.last_seen_at).getTime() + this.idleMs() <= now
    )
      throw new UnauthorizedException(
        "Your session has ended. Please sign in again.",
      );

    const lastSeen = new Date(row.last_seen_at).getTime();
    const seen = now - lastSeen > TOUCH_INTERVAL_MS ? now : lastSeen;
    if (seen === now)
      await this.db.query(
        "UPDATE sessions SET last_seen_at = $2 WHERE id = $1",
        [row.id, new Date(now)],
      );
    const expiresAt = new Date(row.expires_at).getTime();
    return {
      principal: {
        subject: row.user_id,
        displayName: row.name,
        role: row.role,
        providerId: row.provider_id,
        sessionId: row.id,
        mustChangePassword: Boolean(row.must_change_password),
      },
      session: {
        user: {
          id: row.user_id,
          name: row.name,
          email: row.email,
          role: row.role,
        },
        idleExpiresAt: new Date(
          Math.min(seen + this.idleMs(), expiresAt),
        ).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        idleTimeoutMinutes: this.environment.SESSION_IDLE_MINUTES,
        remember: Boolean(row.remember),
        mustChangePassword: Boolean(row.must_change_password),
      },
    };
  }

  async logout(
    principal: AuthenticatedPrincipal,
    client: ClientInfo,
  ): Promise<void> {
    if (!principal.sessionId) return;
    await this.db.query(
      "UPDATE sessions SET revoked_at = now() WHERE id = $1",
      [principal.sessionId],
    );
    await this.audit.record({
      actor: principal.displayName,
      actorId: principal.subject,
      eventType: "LOGOUT",
      outcome: "SUCCESS",
      summary: "Signed out",
      ip: client.ip ?? null,
    });
  }

  /**
   * The signed-in user replaces their password (a temporary one after a reset,
   * or by choice). Their other sessions end; this one stays signed in.
   */
  async changePassword(
    principal: AuthenticatedPrincipal,
    input: { currentPassword: string; newPassword: string },
    client: ClientInfo,
  ): Promise<void> {
    this.assertEnabled();
    const [user] = await this.db.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [principal.subject],
    );
    if (
      !user ||
      !(await verifyPassword(input.currentPassword, user.password_hash))
    ) {
      // Wrong guesses here count toward the same lockout as sign-in, so an
      // open session cannot be used to guess the password indefinitely.
      const nowLocked = await this.recordFailedPassword(principal.subject);
      if (nowLocked) await this.revokeAll(principal.subject);
      await this.audit.record({
        actor: principal.displayName,
        actorId: principal.subject,
        eventType: "PASSWORD_CHANGE",
        outcome: "DENIED",
        summary: nowLocked
          ? "Password change denied: account locked and signed out after repeated failures"
          : "Password change denied: current password incorrect",
        ip: client.ip ?? null,
      });
      if (nowLocked)
        throw new UnauthorizedException(
          "Too many incorrect attempts. You have been signed out.",
        );
      throw new BadRequestException("Your current password is incorrect.");
    }
    await this.db.query(
      `UPDATE users SET password_hash = $2, must_change_password = FALSE,
              failed_logins = 0, locked_until = NULL, updated_at = now()
        WHERE id = $1`,
      [principal.subject, await hashPassword(input.newPassword)],
    );
    await this.db.query(
      "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND id <> $2",
      [principal.subject, principal.sessionId ?? ""],
    );
    await this.audit.record({
      actor: principal.displayName,
      actorId: principal.subject,
      eventType: "PASSWORD_CHANGE",
      outcome: "SUCCESS",
      summary: "Changed own password",
      ip: client.ip ?? null,
    });
  }

  /**
   * Count a wrong password; after LOGIN_MAX_ATTEMPTS in a row the account is
   * locked for LOGIN_LOCK_MINUTES. Returns whether it is now locked.
   */
  private async recordFailedPassword(userId: string): Promise<boolean> {
    const [row] = await this.db.query<{ locked: boolean }>(
      `UPDATE users SET failed_logins = failed_logins + 1,
              locked_until = CASE WHEN failed_logins + 1 >= $2
                THEN now() + make_interval(mins => $3) ELSE locked_until END
        WHERE id = $1
        RETURNING locked_until IS NOT NULL AND locked_until > now() AS locked`,
      [
        userId,
        this.environment.LOGIN_MAX_ATTEMPTS,
        this.environment.LOGIN_LOCK_MINUTES,
      ],
    );
    return row?.locked ?? false;
  }

  /** End every session of a user (deactivation, password reset). */
  async revokeAll(userId: string, db: Database = this.db): Promise<void> {
    await db.query(
      "UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId],
    );
  }

  assertRole(
    principal: AuthenticatedPrincipal,
    roles: readonly UserRole[],
  ): void {
    if (!roles.includes(principal.role))
      throw new ForbiddenException("You do not have access to this resource");
  }
}
