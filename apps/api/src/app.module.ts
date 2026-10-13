import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AdminController } from "./admin/admin.controller.js";
import { AdminService } from "./admin/admin.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthenticationGuard } from "./auth/auth.guard.js";
import { RolesGuard } from "./auth/roles.guard.js";
import { DocsController } from "./docs/docs.controller.js";
import { correlationMiddleware } from "./common/correlation.middleware.js";
import { loadEnvironment } from "./config/environment.js";
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
