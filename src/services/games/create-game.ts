import { v4 as uuidv4 } from 'uuid';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CreateGamePayload, GameRecord, GameVersionRecord, GameResponse } from '../../types/game.types';
import { docClient, GAMES_TABLE, GAME_VERSIONS_TABLE, USERS_TABLE, MAX_TOTAL_GAMES, MAX_MONTHLY_GAMES } from './_client';
import {
  toGameResponse,
  getCurrentMonthKey,
  isTransactionCancelledError,
  getUserForQuotaCheck,
  throwQuotaError,
} from './_helpers';

export const createGame = async (userId: string, payload: CreateGamePayload): Promise<GameResponse> => {
  const now = new Date().toISOString();
  const currentMonth = getCurrentMonthKey();
  const gameId = uuidv4();
  const versionId = uuidv4();

  const gameRecord: GameRecord = {
    gameId,
    userId,
    type: payload.type,
    title: payload.title.trim(),
    description: payload.description,
    category: payload.category,
    tags: payload.tags ?? [],
    visibility: 'draft',
    content: payload.content,
    viewCount: 0,
    playCount: 0,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
    currentVersion: 1,
  };

  const versionRecord: GameVersionRecord = {
    versionId,
    gameId,
    userId,
    versionNumber: 1,
    changeLog: 'Initial version',
    visibility: 'draft',
    createdAt: now,
  };

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: USERS_TABLE,
              Key: { userId },
              ConditionExpression:
                '(attribute_not_exists(totalGames) OR totalGames < :maxTotal) AND ' +
                '(#csm = :currentMonth AND (attribute_not_exists(gamesThisMonth) OR gamesThisMonth < :maxMonthly)) OR ' +
                '(#csm <> :currentMonth)',
              UpdateExpression:
                'SET ' +
                'totalGames = if_not_exists(totalGames, :zero) + :one, ' +
                'gamesThisMonth = if_not_exists(gamesThisMonth, :zero) + :one, ' +
                '#csm = :currentMonth',
              ExpressionAttributeNames: { '#csm': 'currentMonthStart' },
              ExpressionAttributeValues: {
                ':zero': 0,
                ':one': 1,
                ':maxTotal': MAX_TOTAL_GAMES,
                ':maxMonthly': MAX_MONTHLY_GAMES,
                ':currentMonth': currentMonth,
              },
            },
          },
          {
            Put: {
              TableName: GAMES_TABLE,
              Item: gameRecord,
              ConditionExpression: 'attribute_not_exists(gameId)',
            },
          },
          {
            Put: {
              TableName: GAME_VERSIONS_TABLE,
              Item: versionRecord,
              ConditionExpression: 'attribute_not_exists(versionId)',
            },
          },
        ],
      })
    );
  } catch (err: unknown) {
    if (isTransactionCancelledError(err)) {
      const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
      const userReason = reasons[0];
      if (userReason?.Code === 'ConditionalCheckFailed') {
        const user = await getUserForQuotaCheck(userId, currentMonth);
        throwQuotaError(user.totalGames, user.gamesThisMonth, user.currentMonthStart, currentMonth);
      }
    }
    throw err;
  }

  return toGameResponse(gameRecord);
};
