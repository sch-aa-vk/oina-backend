import { randomUUID } from 'crypto';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GameResultRecord, GameResultResponse, RecordGameResultPayload } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, GAME_RESULTS_TABLE } from './_client';
import { getGameOrThrow } from './_helpers';

export const recordGameResult = async (
  gameId: string,
  payload: RecordGameResultPayload,
  userId?: string
): Promise<GameResultResponse> => {
  const game = await getGameOrThrow(gameId);

  if (game.isDeleted) throw Errors.GAME_NOT_FOUND();
  if (game.visibility === 'draft') throw Errors.GAME_FORBIDDEN();

  await docClient.send(new UpdateCommand({
    TableName: GAMES_TABLE,
    Key: { gameId },
    UpdateExpression: 'SET playCount = playCount + :one',
    ExpressionAttributeValues: { ':one': 1 },
  }));

  if (!userId) {
    return {
      gameResultId: '',
      gameId,
      score: payload.score,
      maxScore: payload.maxScore,
      duration: payload.duration,
      completionStatus: payload.completionStatus,
      playedAt: new Date().toISOString(),
    };
  }

  const now = new Date().toISOString();
  const record: GameResultRecord = {
    gameResultId: randomUUID(),
    userId,
    gameId,
    score: payload.score,
    maxScore: payload.maxScore,
    duration: payload.duration,
    completionStatus: payload.completionStatus,
    playedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: GAME_RESULTS_TABLE,
    Item: record,
  }));

  return {
    gameResultId: record.gameResultId,
    gameId: record.gameId,
    score: record.score,
    maxScore: record.maxScore,
    duration: record.duration,
    completionStatus: record.completionStatus,
    playedAt: record.playedAt,
  };
};
