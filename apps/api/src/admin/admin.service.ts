import {
  ConflictException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { z } from "zod";
import {
  auditEventSchema,
  managedUserSchema,
  syncStatusSchema,
  syntheticAuditEvents,
  syntheticSyncStatus,
  syntheticThresholds,
  syntheticUsers,
  thresholdSchema,
  thresholdUpdateSchema,
  type AuditEvent,
  type ManagedUser,
  type SyncStatus,
  type Threshold,
} from "@smart-rounding/contracts";
import type { Environment } from "../config/environment.js";

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException("Request validation failed");
  return result.data;
}

@Injectable()
export class AdminService {
  private thresholds = structuredClone(syntheticThresholds);
  private users = structuredClone(syntheticUsers);
  private sync = structuredClone(syntheticSyncStatus);
  constructor(
    @Inject("ENVIRONMENT") private readonly environment: Environment,
  ) {}
  listThresholds(): Threshold[] {
    this.assertSynthetic();
    return this.thresholds.map((item) => thresholdSchema.parse(item));
  }
  updateThreshold(id: string, input: unknown): Threshold {
    this.assertSynthetic();
    const update = parseInput(thresholdUpdateSchema, input);
    const item = this.thresholds.find((candidate) => candidate.id === id);
    if (!item) throw new NotFoundException("Threshold not found");
    if (update.version !== item.version)
      throw new ConflictException(
        "Threshold has changed; refresh and try again",
      );
    if (update.value < item.minimum || update.value > item.maximum)
      throw new ConflictException(
        "Threshold value is outside its allowed range",
      );
    item.value = update.value;
    item.version += 1;
    item.updatedAt = new Date().toISOString();
    return thresholdSchema.parse(item);
  }
  listUsers(): ManagedUser[] {
    this.assertSynthetic();
    return this.users.map((item) => managedUserSchema.parse(item));
  }
  createUser(input: unknown): ManagedUser {
    this.assertSynthetic();
    const create = parseInput(managedUserSchema.omit({ id: true }), input);
    if (this.users.some((user) => user.email === create.email))
      throw new ConflictException("A user with this email already exists");
    const user = managedUserSchema.parse({
      ...create,
      id: `user-${String(this.users.length + 1).padStart(3, "0")}`,
    });
    this.users.push(user);
    return user;
  }
  updateUser(id: string, input: unknown): ManagedUser {
    this.assertSynthetic();
    const update = parseInput(
      managedUserSchema.pick({ role: true, status: true }).partial(),
      input,
    );
    const item = this.users.find((candidate) => candidate.id === id);
    if (!item) throw new NotFoundException("User not found");
    Object.assign(item, update);
    return managedUserSchema.parse(item);
  }
  auditEvents(): AuditEvent[] {
    this.assertSynthetic();
    return syntheticAuditEvents.map((item) => auditEventSchema.parse(item));
  }
  syncStatus(): SyncStatus {
    this.assertSynthetic();
    return syncStatusSchema.parse(this.sync);
  }
  triggerSync(): SyncStatus {
    this.assertSynthetic();
    if (this.sync.status === "RUNNING")
      throw new ConflictException("A synchronization is already running");
    this.sync = {
      id: `sync-${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: null,
      trigger: "MANUAL",
      status: "RUNNING",
      recordsProcessed: 0,
      validationRejects: 0,
      errors: 0,
    };
    return syncStatusSchema.parse(this.sync);
  }
  private assertSynthetic(): void {
    if (this.environment.DATA_MODE !== "synthetic")
      throw new ServiceUnavailableException(
        "Administrative data source is not configured",
      );
  }
}
