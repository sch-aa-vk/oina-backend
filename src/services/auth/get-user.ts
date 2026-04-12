import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { UserRecord } from '../../types/user.types';
import { docClient, USERS_TABLE } from './_client';

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
