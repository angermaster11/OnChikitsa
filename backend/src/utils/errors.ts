/**
 * Application error codes exposed to clients via the standard error envelope.
 * Codes are stable identifiers the frontend can branch on; messages are human text.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',

  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CLINIC_NOT_FOUND: 'CLINIC_NOT_FOUND',
  DOCTOR_NOT_FOUND: 'DOCTOR_NOT_FOUND',
  ADMIN_NOT_FOUND: 'ADMIN_NOT_FOUND',
  FAQ_NOT_FOUND: 'FAQ_NOT_FOUND',
  AUDIT_LOG_NOT_FOUND: 'AUDIT_LOG_NOT_FOUND',

  ALREADY_BANNED: 'ALREADY_BANNED',
  NOT_BANNED: 'NOT_BANNED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  PHONE_TAKEN: 'PHONE_TAKEN',
  PROTECTED_RESOURCE: 'PROTECTED_RESOURCE',
  UPLOAD_NOT_CONFIGURED: 'UPLOAD_NOT_CONFIGURED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Base application error. Anything thrown that is an instance of AppError is
 * treated as an expected/operational error by the global error handler and its
 * `code` + `message` are surfaced to the client. Everything else becomes a 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(code: ErrorCode = ERROR_CODES.UNAUTHORIZED, message = 'Authentication required') {
    super(401, code, message);
  }
}
export class ForbiddenError extends AppError {
  constructor(code: ErrorCode = ERROR_CODES.FORBIDDEN, message = 'You do not have permission to perform this action') {
    super(403, code, message);
  }
}
export class NotFoundError extends AppError {
  constructor(code: ErrorCode = ERROR_CODES.NOT_FOUND, message = 'Resource not found') {
    super(404, code, message);
  }
}
export class ConflictError extends AppError {
  constructor(code: ErrorCode = ERROR_CODES.CONFLICT, message = 'Resource conflict') {
    super(409, code, message);
  }
}
