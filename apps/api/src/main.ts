import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { HttpErrorFilter } from "./common/http-error.filter.js";
import { loadEnvironment } from "./config/environment.js";

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment();
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.use(helmet());
  app.enableCors({
    origin: environment.ALLOWED_ORIGINS.split(",").map((value) => value.trim()),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  });
  app.useGlobalFilters(new HttpErrorFilter());
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  await app.listen(environment.PORT, "0.0.0.0");
}

void bootstrap();
