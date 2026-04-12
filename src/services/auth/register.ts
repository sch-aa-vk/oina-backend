import bcrypt from 'bcryptjs';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { OTPRecord } from '../../types/auth.types';
import { generateOTPCode, getOTPExpiry } from '../../utils/otp';
import { Errors } from '../../utils/errors';
import { sendVerificationEmail } from '../email';
import { docClient, BCRYPT_ROUNDS, OTP_TABLE } from './_client';
import { getUserByEmail } from './get-user';
import { deleteExistingOTP } from './_otp-helpers';

export const register = async (email: string, password: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw Errors.EMAIL_ALREADY_EXISTS();
  }

  await deleteExistingOTP(normalizedEmail, 'email-verification');

  const code = generateOTPCode();
  const hashedCode = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const otpRecord: OTPRecord = {
    email: normalizedEmail,
    type: 'email-verification',
    code: hashedCode,
    userId: `${normalizedEmail}::${hashedPassword}`,
    attempts: 0,
    createdAt: new Date().toISOString(),
    expiresAt: getOTPExpiry(),
  };

  await docClient.send(new PutCommand({ TableName: OTP_TABLE, Item: otpRecord }));
  await sendVerificationEmail(normalizedEmail, code);
};
