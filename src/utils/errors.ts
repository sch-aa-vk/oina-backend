export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(statusCode: number, errorCode: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const Errors = {
  EMAIL_ALREADY_EXISTS: () => new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists'),
  USER_NOT_FOUND: () => new AppError(404, 'USER_NOT_FOUND', 'User not found'),
  INVALID_CREDENTIALS: () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  EMAIL_NOT_VERIFIED: () => new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in'),

  OTP_NOT_FOUND: () => new AppError(404, 'OTP_NOT_FOUND', 'No verification code found. Please request a new one'),
  OTP_EXPIRED: () => new AppError(410, 'OTP_EXPIRED', 'Verification code has expired. Please request a new one'),
  OTP_INVALID: () => new AppError(400, 'OTP_INVALID', 'Invalid verification code'),
  OTP_MAX_ATTEMPTS: () => new AppError(429, 'OTP_MAX_ATTEMPTS', 'Too many failed attempts. Please request a new code'),

  TOKEN_MISSING: () => new AppError(401, 'TOKEN_MISSING', 'Authorization token is required'),
  TOKEN_INVALID: () => new AppError(401, 'TOKEN_INVALID', 'Invalid or malformed token'),
  TOKEN_EXPIRED: () => new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'),
  TOKEN_BLACKLISTED: () => new AppError(401, 'TOKEN_BLACKLISTED', 'Token has been invalidated'),
  TOKEN_TYPE_MISMATCH: () => new AppError(401, 'TOKEN_TYPE_MISMATCH', 'Invalid token type'),

  VALIDATION_ERROR: (details: Record<string, unknown>) =>
    new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details),

  INTERNAL_ERROR: () => new AppError(500, 'INTERNAL_ERROR', 'An internal server error occurred'),
};
