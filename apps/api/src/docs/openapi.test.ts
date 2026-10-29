import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { AdminController } from "../admin/admin.controller.js";
import { AuthController } from "../auth/auth.controller.js";
import { HealthController } from "../health/health.controller.js";
import { ProviderController } from "../provider/provider.controller.js";
import { DocsController } from "./docs.controller.js";
import { buildOpenApiDocument } from "./openapi.js";

type Controller = Readonly<{ prototype: object }>;

const joinPath = (...parts: string[]): string =>
  "/" +
  parts
    .flatMap((p) => p.split("/"))
    .filter(Boolean)
    .map((seg) => (seg.startsWith(":") ? `{${seg.slice(1)}}` : seg))
    .join("/");

/** Every `method path` a controller declares, read from Nest's route metadata. */
function routesOf(controller: Controller): string[] {
  const base = Reflect.getMetadata(PATH_METADATA, controller) as string;
  const proto = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto).flatMap((name) => {
    const handler = proto[name];
    if (typeof handler !== "function" || name === "constructor") return [];
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      RequestMethod | undefined;
    if (method === undefined) return [];
    const path = Reflect.getMetadata(PATH_METADATA, handler) as string;
    return [`${RequestMethod[method].toLowerCase()} ${joinPath(base, path)}`];
  });
}

const controllers: Controller[] = [
  HealthController,
  DocsController,
  AuthController,
  ProviderController,
  AdminController,
];

void test("every controller route is documented, and nothing extra is", () => {
  const doc = buildOpenApiDocument("test");
  const documented = Object.entries(doc.paths).flatMap(([path, ops]) =>
    Object.keys(ops).map((method) => `${method} ${path}`),
  );
  const implemented = controllers.flatMap(routesOf);
  assert.ok(implemented.length >= 15, "route discovery found the controllers");
  assert.deepEqual([...implemented].sort(), [...documented].sort());
});

void test("component schemas are generated from the contracts", () => {
  const { components } = buildOpenApiDocument("test");
  assert.ok("RoundingPatient" in components.schemas);
  assert.ok("CreateUserRequest" in components.schemas);
});
