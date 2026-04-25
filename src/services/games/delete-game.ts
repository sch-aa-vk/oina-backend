import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GAMES_TABLE, USERS_TABLE } from './_client';
import { getGameOrThrow, assertOwner } from './_helpers';

export const deleteGame = async (userId: string, gameId: string): Promise<void> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  if (game.isDeleted) return;

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId },
      UpdateExpression: 'SET isDeleted = :true, deletedAt = :now',
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':true': true, ':now': now, ':userId': userId },
    })
  );

  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET totalGames = totalGames - :one',
      ConditionExpression: 'totalGames > :zero',
      ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
    })
  ).catch(() => {
    // best-effort decrement
  });
};
