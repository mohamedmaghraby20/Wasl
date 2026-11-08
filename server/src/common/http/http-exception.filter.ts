import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const capacityMessage = isHttpException && status === 400 &&
      ['No community capacity is currently available.', 'No event capacity is currently available.']
        .includes(exception.message) ? exception.message : undefined;
    const message = capacityMessage ?? (status === 400
      ? 'Please check your information and try again.'
      : status === 401
        ? 'Please sign in and try again.'
        : status === 403
          ? 'You cannot complete this action.'
          : status === 404
            ? 'This page or item is not available.'
            : status === 429
              ? 'Too many attempts. Please try again later.'
              : 'Something went wrong. Please try again later.');

    response.status(status).send({
      statusCode: status,
      code: status >= 500 ? 'ServiceError' : 'RequestError',
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
