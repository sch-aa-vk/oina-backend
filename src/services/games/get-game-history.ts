import { QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { GameRecord, GameResultRecord, GameHistoryResponse } from '../../types/game.types';
import { docClient, GAME_RESULTS_TABLE, GAMES_TABLE } from './_client';

const MAX_UNIQUE_GAMES = 5;
const FETCH_LIMIT = 100;

export const getGameHistory = async (userId: string): Promise<GameHistoryResponse> => {
  const result = await docClient.send(new QueryCommand({
    TableName: GAME_RESULTS_TABLE,
    IndexName: 'userId-playedAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false,
    Limit: FETCH_LIMIT,
  }));

  const records = (result.Items as GameResultRecord[]) ?? [];

  const bestByGame = new Map<string, GameResultRecord>();
  for (const record of records) {
    const existing = bestByGame.get(record.gameId);
    if (!existing || record.score > existing.score) {
      bestByGame.set(record.gameId, record);
    }
  }

  const deduplicated = [...bestByGame.values()]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, MAX_UNIQUE_GAMES);

  const gameIds = deduplicated.map(r => r.gameId);
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

  const results = deduplicated.map(r => ({
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

  return { results };
};
