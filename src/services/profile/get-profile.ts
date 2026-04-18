import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { UserRecord } from '../../types/user.types';
import { Errors } from '../../utils/errors';
import { docClient, USERS_TABLE } from './_client';

export const getCurrentUserProfile = async (userId: string): Promise<UserRecord> => {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));

  if (!result.Item) {
    throw Errors.USER_NOT_FOUND();
  }

  return result.Item as UserRecord;
};
