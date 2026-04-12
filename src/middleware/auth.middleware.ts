import { APIGatewayProxyEvent } from 'aws-lambda';
import { validateAccessToken } from '../services/token';
import { TokenPayload } from '../types/auth.types';
import { Errors } from '../utils/errors';

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user: {
    userId: string;
    email: string;
    jti: string;
  };
}

const extractBearerToken = (event: APIGatewayProxyEvent): string => {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];

  if (!authHeader) throw Errors.TOKEN_MISSING();

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw Errors.TOKEN_INVALID();
  }

  return parts[1];
};

export const requireAuth = async (event: APIGatewayProxyEvent): Promise<TokenPayload> => {
  const token = extractBearerToken(event);
  const payload = await validateAccessToken(token);
  return payload;
};
