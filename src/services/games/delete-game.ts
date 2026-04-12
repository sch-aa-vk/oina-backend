import { DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GAMES_TABLE, USERS_TABLE } from './_client';
import { getGameOrThrow, assertOwner } from './_helpers';

export const deleteGame = async (userId: string, gameId: string): Promise<void> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  await docClient.send(
    new DeleteCommand({
      TableName: GAMES_TABLE,
      Key: { gameId },
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
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
    // If counter is already 0, swallow the error (best-effort decrement)
  });
};
