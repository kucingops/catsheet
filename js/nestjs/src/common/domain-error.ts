/**
 * Hierarki error domain. Domain layer TIDAK tahu soal HTTP (nggak import apa pun dari @nestjs).
 * Mapping ke status code dilakukan di DomainExceptionFilter (mirip @ControllerAdvice di Spring).
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name; // nama subclass yang sebenarnya dibuat
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}
