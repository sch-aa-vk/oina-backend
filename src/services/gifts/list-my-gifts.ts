import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GiftRecord } from '../../types/gift.types';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const GIFTS_TABLE = process.env.DYNAMODB_GIFTS_TABLE!;
const PAGE_SIZE = 20;

export interface GiftListResponse {
  gifts: GiftRecord[];
  nextCursor?: string;
}

export const listMyGifts = async (userId: string, cursor?: string): Promise<GiftListResponse> => {
  const result = await docClient.send(new QueryCommand({
    TableName: GIFTS_TABLE,
    IndexName: 'userId-createdAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
    Limit: PAGE_SIZE,
    ...(cursor ? { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) } : {}),
  }));

  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return { gifts: (result.Items as GiftRecord[]) ?? [], nextCursor };
};
