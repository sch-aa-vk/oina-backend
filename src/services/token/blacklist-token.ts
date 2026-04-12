import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { TokenBlacklistRecord } from '../../types/auth.types';
import { decodeToken } from '../../utils/jwt';
import { Errors } from '../../utils/errors';
import { docClient, BLACKLIST_TABLE } from './_client';

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
