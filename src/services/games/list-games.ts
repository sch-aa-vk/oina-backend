import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GameRecord, GameListResponse } from '../../types/game.types';
import { docClient, GAMES_TABLE } from './_client';
import { toGameResponse } from './_helpers';

export const listUserGames = async (userId: string, cursor?: string): Promise<GameListResponse> => {
  const exclusiveStartKey = cursor
    ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Record<string, unknown>)
    : undefined;

  const result = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
      Limit: 20,
      ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
    })
  );

  const games = await Promise.all((result.Items ?? []).map((item) => toGameResponse(item as GameRecord)));
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return { games, nextCursor };
};
