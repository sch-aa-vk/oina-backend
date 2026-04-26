import bcrypt from 'bcryptjs';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { OTPRecord } from '../../types/auth.types';
import { generateOTPCode, getOTPExpiry } from '../../utils/otp';
import { sendPasswordResetEmail } from '../email';
import { docClient, BCRYPT_ROUNDS, OTP_TABLE } from './_client';
import { getUserByEmail } from './get-user';
import { deleteExistingOTP } from './_otp-helpers';

export const forgotPassword = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await getUserByEmail(normalizedEmail);
  if (!user) return;

  await deleteExistingOTP(normalizedEmail, 'password-reset');

  const code = generateOTPCode();
  const hashedCode = await bcrypt.hash(code, BCRYPT_ROUNDS);

  const otpRecord: OTPRecord = {
    email: normalizedEmail,
    type: 'password-reset',
    code: hashedCode,
    userId: user.userId,
    attempts: 0,
    createdAt: new Date().toISOString(),
    expiresAt: getOTPExpiry(),
  };

  await docClient.send(new PutCommand({ TableName: OTP_TABLE, Item: otpRecord }));
  await sendPasswordResetEmail(normalizedEmail, code);
};
