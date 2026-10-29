import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const KEY_LENGTH = 64;
const OPTIONS: ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

/** `scrypt$N$r$p$salt$hash`, all base64url. Never store a password in plain text. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return [
    "scrypt",
    OPTIONS.N,
    OPTIONS.r,
    OPTIONS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, , , , salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** A readable one-time password for new or reset accounts. */
export function temporaryPassword(): string {
  return `Tmp-${randomBytes(9).toString("base64url")}`;
}

/** Opaque session token handed to the browser; only its hash is stored. */
export function newSessionToken(): { token: string; id: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, id: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
