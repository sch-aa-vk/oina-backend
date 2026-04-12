import bcrypt from 'bcryptjs';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { OTPRecord } from '../../types/auth.types';
import { generateOTPCode, getOTPExpiry } from '../../utils/otp';
import { sendVerificationEmail } from '../email';
import { docClient, BCRYPT_ROUNDS, OTP_TABLE } from './_client';
import { deleteExistingOTP } from './_otp-helpers';

export const resendVerificationCode = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  await deleteExistingOTP(normalizedEmail, 'email-verification');

  const code = generateOTPCode();
  const hashedCode = await bcrypt.hash(code, BCRYPT_ROUNDS);

  const otpRecord: OTPRecord = {
    email: normalizedEmail,
    type: 'email-verification',
    code: hashedCode,
    attempts: 0,
    createdAt: new Date().toISOString(),
    expiresAt: getOTPExpiry(),
  };

  await docClient.send(new PutCommand({ TableName: OTP_TABLE, Item: otpRecord }));
  await sendVerificationEmail(normalizedEmail, code);
};
