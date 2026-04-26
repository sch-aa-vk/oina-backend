import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, BLACKLIST_TABLE } from './_client';

export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  const result = await docClient.send(new GetCommand({
    TableName: BLACKLIST_TABLE,
    Key: { jti },
  }));

  return !!result.Item;
};
