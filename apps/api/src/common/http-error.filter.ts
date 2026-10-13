import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const correlationId = String(
      response.locals.correlationId ?? "unavailable",
    );
    const isExpected = exception instanceof HttpException && statusCode < 500;
    response.status(statusCode).json({
      statusCode,
      code: isExpected ? `HTTP_${statusCode}` : "INTERNAL_ERROR",
      message: isExpected ? exception.message : "An unexpected error occurred",
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  }
}
