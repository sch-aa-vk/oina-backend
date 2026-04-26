import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { GameResponse } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, USERS_TABLE } from './_client';
import { getGameOrThrow, assertOwner, toGameResponse } from './_helpers';

export const restoreGame = async (userId: string, gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  if (!game.isDeleted) throw Errors.GAME_NOT_DELETED();

  const now = new Date().toISOString();

  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: GAMES_TABLE,
          Key: { gameId },
          UpdateExpression: 'REMOVE isDeleted, deletedAt SET updatedAt = :now',
          ConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':now': now, ':userId': userId },
        },
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: { userId },
          UpdateExpression: 'SET totalGames = totalGames + :one',
          ExpressionAttributeValues: { ':one': 1 },
        },
      },
    ],
  }));

  const restored = { ...game, isDeleted: undefined, deletedAt: undefined, updatedAt: now };
  return toGameResponse(restored);
};
