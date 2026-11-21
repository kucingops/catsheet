import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ConflictError, DomainError, NotFoundError } from './domain-error.js';

/** Terjemahkan DomainError -> HTTP response. Padanan @ControllerAdvice + @ExceptionHandler. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = DomainExceptionFilter.statusOf(error);
    res.status(status).json({ statusCode: status, code: error.code, message: error.message });
  }

  static statusOf(error: DomainError): number {
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    return HttpStatus.BAD_REQUEST;
  }
}
