import { Controller, Get, Inject } from "@nestjs/common";
import type { ServiceStatus } from "@smart-rounding/contracts";
import type { Environment } from "../config/environment.js";
import { Public } from "../auth/auth.decorators.js";

@Controller()
export class HealthController {
  constructor(
    @Inject("ENVIRONMENT") private readonly environment: Environment,
  ) {}

  @Get("health")
  @Public()
  health(): ServiceStatus {
    return this.status();
  }

  @Get("ready")
  @Public()
  ready(): ServiceStatus {
    return this.status();
  }

  private status(): ServiceStatus {
    return {
      status: "ok",
      service: "smart-rounding-api",
      version: this.environment.SERVICE_VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}
