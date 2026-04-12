import bcrypt from 'bcryptjs';
import { Errors } from '../../utils/errors';
import { issueTokens } from '../token';
import { getUserByEmail } from './get-user';

export const login = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await getUserByEmail(normalizedEmail);
  if (!user) throw Errors.INVALID_CREDENTIALS();
  if (!user.isVerified) throw Errors.EMAIL_NOT_VERIFIED();

  const isValid = await bcrypt.compare(password, (user as any).passwordHash);
  if (!isValid) throw Errors.INVALID_CREDENTIALS();

  const tokens = issueTokens(user.userId, user.email);

  const { passwordHash: _, ...safeUser } = user as any;

  return { tokens, user: safeUser };
};
