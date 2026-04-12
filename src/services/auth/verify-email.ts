import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { UserRecord } from '../../types/user.types';
import { isMaxAttemptsExceeded } from '../../utils/otp';
import { Errors } from '../../utils/errors';
import { createCognitoUser } from '../cognito';
import { docClient, USERS_TABLE, OTP_TABLE } from './_client';
import { getActiveOTP, incrementOTPAttempts } from './_otp-helpers';

export const verifyEmail = async (email: string, code: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord = await getActiveOTP(normalizedEmail, 'email-verification');
  if (!otpRecord) throw Errors.OTP_NOT_FOUND();
  if (isMaxAttemptsExceeded(otpRecord.attempts)) throw Errors.OTP_MAX_ATTEMPTS();

  const isValid = await bcrypt.compare(code, otpRecord.code);
  if (!isValid) {
    await incrementOTPAttempts(normalizedEmail, 'email-verification', otpRecord.attempts);
    throw Errors.OTP_INVALID();
  }

  const [, hashedPassword] = (otpRecord.userId ?? '').split('::');

  const userId = uuidv4();
  await createCognitoUser(userId, normalizedEmail, `Temp_${userId.replace(/-/g, '').slice(0, 12)}!`);

  const now = new Date().toISOString();
  const userRecord: UserRecord = {
    userId,
    email: normalizedEmail,
    isVerified: true,
    totalGames: 0,
    gamesThisMonth: 0,
    currentMonthStart: now.slice(0, 7),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: { ...userRecord, passwordHash: hashedPassword } }));
  await docClient.send(new DeleteCommand({ TableName: OTP_TABLE, Key: { email: normalizedEmail, type: 'email-verification' } }));
};
