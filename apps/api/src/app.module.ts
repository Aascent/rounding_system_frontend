import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AdminController } from "./admin/admin.controller.js";
import { AdminService } from "./admin/admin.service.js";
import { AuditService } from "./audit/audit.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { AuthenticationGuard } from "./auth/auth.guard.js";
import { RolesGuard } from "./auth/roles.guard.js";
import { DocsController } from "./docs/docs.controller.js";
import { correlationMiddleware } from "./common/correlation.middleware.js";
import { loadEnvironment } from "./config/environment.js";
import { RoundingDataService } from "./data/rounding-data.service.js";
import { databaseProvider } from "./database/database.provider.js";
import { HealthController } from "./health/health.controller.js";
import { ProviderController } from "./provider/provider.controller.js";
import { ProviderService } from "./provider/provider.service.js";

const environment = loadEnvironment();

@Module({
  controllers: [
    HealthController,
    DocsController,
    ProviderController,
    AdminController,
    AuthController,
  ],
  providers: [
    databaseProvider,
    AuditService,
    AuthService,
    RoundingDataService,
    ProviderService,
    AdminService,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: "ENVIRONMENT", useValue: environment },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(correlationMiddleware).forRoutes("*");
  }
}
