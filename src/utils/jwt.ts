import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { TokenPayload, AuthTokens } from '../types/auth.types';
import { Errors } from './errors';

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

export const generateTokens = (userId: string, email: string): AuthTokens => {
  const accessToken = jwt.sign(
    { userId, email, type: 'access', jti: uuidv4() },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh', jti: uuidv4() },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'access', jti: uuidv4() },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const verifyToken = (token: string, expectedType?: 'access' | 'refresh'): TokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (expectedType && payload.type !== expectedType) {
      throw Errors.TOKEN_TYPE_MISMATCH();
    }

    return payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw Errors.TOKEN_EXPIRED();
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw Errors.TOKEN_INVALID();
    }
    throw err;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  return jwt.decode(token) as TokenPayload | null;
};

export const getTokenExpiry = (payload: TokenPayload): number => {
  return payload.exp;
};
