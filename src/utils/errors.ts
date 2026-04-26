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

  // Game errors
  GAME_NOT_FOUND: () => new AppError(404, 'GAME_NOT_FOUND', 'Game not found'),
  GAME_FORBIDDEN: () => new AppError(403, 'GAME_FORBIDDEN', 'You do not have access to this game'),
  GAME_NOT_DELETED: () => new AppError(409, 'GAME_NOT_DELETED', 'Game is not deleted and cannot be restored'),
  QUOTA_MONTHLY_GAMES_EXCEEDED: () =>
    new AppError(409, 'QUOTA_MONTHLY_GAMES_EXCEEDED', 'You have reached the limit of 5 games per month'),
  INVALID_GAME_PAYLOAD: (details: Record<string, unknown>) =>
    new AppError(400, 'INVALID_GAME_PAYLOAD', 'Invalid game payload', details),
  CONTENT_TOO_LARGE: () =>
    new AppError(413, 'CONTENT_TOO_LARGE', 'Game content exceeds the maximum allowed size of 100KB'),
  INVALID_REWARD_PAYLOAD: (details: Record<string, unknown>) =>
    new AppError(400, 'INVALID_REWARD_PAYLOAD', 'Invalid reward payload', details),
  INVALID_VISIBILITY_TRANSITION: (from: string, to: string) =>
    new AppError(400, 'INVALID_VISIBILITY_TRANSITION', `Cannot transition from '${from}' to '${to}'`),
  PREVIEW_ONLY_FOR_DRAFT: () =>
    new AppError(400, 'PREVIEW_ONLY_FOR_DRAFT', 'Preview is only available for draft games'),
  GAME_ALREADY_LIKED: () => new AppError(409, 'GAME_ALREADY_LIKED', 'You have already liked this game'),
  GAME_NOT_LIKED: () => new AppError(409, 'GAME_NOT_LIKED', 'You have not liked this game'),

  // Profile errors
  USERNAME_TAKEN: () => new AppError(409, 'USERNAME_TAKEN', 'This username is already taken'),

  // Gift errors
  INVALID_GIFT_PAYLOAD: (details: Record<string, unknown>) =>
    new AppError(400, 'INVALID_GIFT_PAYLOAD', 'Invalid gift payload', details),
  GIFT_NOT_FOUND: () => new AppError(404, 'GIFT_NOT_FOUND', 'Gift not found'),
  GEMINI_API_ERROR: (message?: string) =>
    new AppError(502, 'GEMINI_API_ERROR', message ?? 'Gemini API error'),
};
