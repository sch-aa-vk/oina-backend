import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { OTPRecord, OTPType } from '../types/auth.types';
import { UserRecord } from '../types/user.types';
import { generateOTPCode, getOTPExpiry, isMaxAttemptsExceeded } from '../utils/otp';
import { Errors } from '../utils/errors';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';
import { issueTokens } from './token.service';
import { createCognitoUser, updateCognitoUserPassword } from './cognito.service';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE!;
const OTP_TABLE = process.env.DYNAMODB_OTP_TABLE!;
const BCRYPT_ROUNDS = 10;

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

export const getUserByEmail = async (email: string): Promise<UserRecord | null> => {
  const result = await docClient.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  }));

  return (result.Items?.[0] as UserRecord) ?? null;
};

export const getUserById = async (userId: string): Promise<UserRecord | null> => {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));

  return (result.Item as UserRecord) ?? null;
};

const getActiveOTP = async (email: string, type: OTPType): Promise<OTPRecord | null> => {
  const result = await docClient.send(new GetCommand({
    TableName: OTP_TABLE,
    Key: { email, type },
  }));

  return (result.Item as OTPRecord) ?? null;
};

const deleteExistingOTP = async (email: string, type: OTPType): Promise<void> => {
  await docClient.send(new DeleteCommand({
    TableName: OTP_TABLE,
    Key: { email, type },
  }));
};

const incrementOTPAttempts = async (email: string, type: OTPType, currentAttempts: number): Promise<void> => {
  await docClient.send(new UpdateCommand({
    TableName: OTP_TABLE,
    Key: { email, type },
    UpdateExpression: 'SET attempts = :attempts',
    ExpressionAttributeValues: { ':attempts': currentAttempts + 1 },
  }));
};
