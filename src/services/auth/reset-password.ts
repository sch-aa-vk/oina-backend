import bcrypt from 'bcryptjs';
import { UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { isMaxAttemptsExceeded } from '../../utils/otp';
import { Errors } from '../../utils/errors';
import { updateCognitoUserPassword } from '../cognito';
import { docClient, BCRYPT_ROUNDS, USERS_TABLE, OTP_TABLE } from './_client';
import { getActiveOTP, incrementOTPAttempts } from './_otp-helpers';

export const resetPassword = async (email: string, code: string, newPassword: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord = await getActiveOTP(normalizedEmail, 'password-reset');
  if (!otpRecord) throw Errors.OTP_NOT_FOUND();
  if (isMaxAttemptsExceeded(otpRecord.attempts)) throw Errors.OTP_MAX_ATTEMPTS();

  const isValid = await bcrypt.compare(code, otpRecord.code);
  if (!isValid) {
    await incrementOTPAttempts(normalizedEmail, 'password-reset', otpRecord.attempts);
    throw Errors.OTP_INVALID();
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId: otpRecord.userId },
    UpdateExpression: 'SET passwordHash = :pw, updatedAt = :now',
    ExpressionAttributeValues: {
      ':pw': hashedPassword,
      ':now': new Date().toISOString(),
    },
  }));

  await updateCognitoUserPassword(normalizedEmail, newPassword);
  await docClient.send(new DeleteCommand({ TableName: OTP_TABLE, Key: { email: normalizedEmail, type: 'password-reset' } }));
};
