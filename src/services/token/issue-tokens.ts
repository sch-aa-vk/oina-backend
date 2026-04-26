import { generateTokens } from '../../utils/jwt';

export const issueTokens = (userId: string, email: string) => {
  return generateTokens(userId, email);
};
