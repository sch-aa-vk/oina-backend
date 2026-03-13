import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { TokenBlacklistRecord } from '../types/auth.types';
import { verifyToken, decodeToken, generateTokens, generateAccessToken } from '../utils/jwt';
import { Errors } from '../utils/errors';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BLACKLIST_TABLE = process.env.DYNAMODB_BLACKLIST_TABLE!;

export const issueTokens = (userId: string, email: string) => {
  return generateTokens(userId, email);
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const payload = verifyToken(refreshToken, 'refresh');

  const isBlacklisted = await isTokenBlacklisted(payload.jti);
  if (isBlacklisted) {
    throw Errors.TOKEN_BLACKLISTED();
  }

  return generateAccessToken(payload.userId, payload.email);
};

export const blacklistToken = async (token: string, userId: string): Promise<void> => {
  const payload = decodeToken(token);
  if (!payload || !payload.jti) {
    throw Errors.TOKEN_INVALID();
  }

  const record: TokenBlacklistRecord = {
    jti: payload.jti,
    userId,
    expiresAt: payload.exp,
    blacklistedAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: BLACKLIST_TABLE,
    Item: record,
  }));
};

export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  const result = await docClient.send(new GetCommand({
    TableName: BLACKLIST_TABLE,
    Key: { jti },
  }));

  return !!result.Item;
};

export const validateAccessToken = async (token: string) => {
  const payload = verifyToken(token, 'access');

  const isBlacklisted = await isTokenBlacklisted(payload.jti);
  if (isBlacklisted) {
    throw Errors.TOKEN_BLACKLISTED();
  }

  return payload;
};
