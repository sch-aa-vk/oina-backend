import { verifyToken, generateAccessToken } from '../../utils/jwt';
import { Errors } from '../../utils/errors';
import { isTokenBlacklisted } from './is-blacklisted';

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const payload = verifyToken(refreshToken, 'refresh');

  const isBlacklisted = await isTokenBlacklisted(payload.jti);
  if (isBlacklisted) {
    throw Errors.TOKEN_BLACKLISTED();
  }

  return generateAccessToken(payload.userId, payload.email);
};
