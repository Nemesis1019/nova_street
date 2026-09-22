import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { translateErrorMessage } from './error-translations';

@Catch(HttpException)
export class HttpExceptionTranslationFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const locale = (request.headers['accept-language'] as string) || 'es';

    const translate = (message: string) => translateErrorMessage(message, locale);

    let body: Record<string, unknown>;

    if (typeof exceptionResponse === 'string') {
      body = {
        statusCode: status,
        message: translate(exceptionResponse),
        error: exception.name,
      };
    } else {
      const er = exceptionResponse as Record<string, unknown>;
      body = { ...er, statusCode: status };

      if (typeof er.message === 'string') {
        body.message = translate(er.message);
      } else if (Array.isArray(er.message)) {
        body.message = er.message.map((item) =>
          typeof item === 'string' ? translate(item) : item,
        );
      }
    }

    response.status(status).json(body);
  }
}
