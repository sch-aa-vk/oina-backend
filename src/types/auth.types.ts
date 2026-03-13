export interface RegisterPayload {
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResendCodePayload {
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  accessToken: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  jti: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type OTPType = 'email-verification' | 'password-reset';

export interface OTPRecord {
  email: string;
  type: OTPType;
  code: string;
  userId?: string;
  attempts: number;
  createdAt: string;
  expiresAt: number;
}

export interface TokenBlacklistRecord {
  jti: string;
  userId: string;
  expiresAt: number;
  blacklistedAt: string;
}
