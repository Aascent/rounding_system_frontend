import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const headerName = "x-correlation-id";
const safeCorrelationId = /^[A-Za-z0-9._-]{1,128}$/;

export function correlationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header(headerName);
  const correlationId =
    incoming && safeCorrelationId.test(incoming) ? incoming : randomUUID();
  response.locals.correlationId = correlationId;
  response.setHeader(headerName, correlationId);
  next();
}
