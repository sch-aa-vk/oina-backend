import { verifyToken } from '../../utils/jwt';
import { Errors } from '../../utils/errors';
import { isTokenBlacklisted } from './is-blacklisted';

export const validateAccessToken = async (token: string) => {
  const payload = verifyToken(token, 'access');

  const isBlacklisted = await isTokenBlacklisted(payload.jti);
  if (isBlacklisted) {
    throw Errors.TOKEN_BLACKLISTED();
  }

  return payload;
};
