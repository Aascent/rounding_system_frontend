import { Controller, Get, Inject } from "@nestjs/common";
import type { Environment } from "../config/environment.js";
import { Public } from "../auth/auth.decorators.js";
import { buildOpenApiDocument, type OpenApiDocument } from "./openapi.js";

@Controller()
export class DocsController {
  private readonly document: OpenApiDocument;

  constructor(@Inject("ENVIRONMENT") environment: Environment) {
    this.document = buildOpenApiDocument(environment.SERVICE_VERSION);
  }

  @Get("openapi.json")
  @Public()
  openapi(): OpenApiDocument {
    return this.document;
  }
}
