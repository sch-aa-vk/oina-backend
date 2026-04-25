import { QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { GameRecord, GameResultRecord, GameHistoryResponse } from '../../types/game.types';
import { docClient, GAME_RESULTS_TABLE, GAMES_TABLE } from './_client';

const PAGE_SIZE = 20;

export const getGameHistory = async (
  userId: string,
  cursor?: string
): Promise<GameHistoryResponse> => {
  const result = await docClient.send(new QueryCommand({
    TableName: GAME_RESULTS_TABLE,
    IndexName: 'userId-playedAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
    Limit: PAGE_SIZE,
    ...(cursor ? { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) } : {}),
  }));

  const records = (result.Items as GameResultRecord[]) ?? [];

  const gameIds = [...new Set(records.map(r => r.gameId))];
  const gameMeta: Record<string, { title: string; isDeleted?: boolean }> = {};

  if (gameIds.length > 0) {
    const batchResult = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [GAMES_TABLE]: {
          Keys: gameIds.map(id => ({ gameId: id })),
          ProjectionExpression: 'gameId, title, isDeleted',
        },
      },
    }));
    for (const item of (batchResult.Responses?.[GAMES_TABLE] ?? []) as GameRecord[]) {
      gameMeta[item.gameId] = { title: item.title, isDeleted: item.isDeleted };
    }
  }

  const results = records.map(r => ({
    gameResultId: r.gameResultId,
    gameId: r.gameId,
    gameTitle: gameMeta[r.gameId]?.title,
    isGameDeleted: gameMeta[r.gameId]?.isDeleted ?? false,
    score: r.score,
    maxScore: r.maxScore,
    duration: r.duration,
    completionStatus: r.completionStatus,
    playedAt: r.playedAt,
  }));

  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return { results, nextCursor };
};
