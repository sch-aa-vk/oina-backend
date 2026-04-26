import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, GAME_LIKES_TABLE } from './_client';
import { getGameOrThrow, isTransactionCancelledError } from './_helpers';

export const likeGame = async (userId: string, gameId: string): Promise<void> => {
  await getGameOrThrow(gameId);

  const likeKey = `${userId}#${gameId}`;
  const now = new Date().toISOString();

  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: GAME_LIKES_TABLE,
            Item: { likeKey, userId, gameId, createdAt: now },
            ConditionExpression: 'attribute_not_exists(likeKey)',
          },
        },
        {
          Update: {
            TableName: GAMES_TABLE,
            Key: { gameId },
            UpdateExpression: 'SET likeCount = likeCount + :one',
            ExpressionAttributeValues: { ':one': 1 },
          },
        },
      ],
    }));
  } catch (err: unknown) {
    if (isTransactionCancelledError(err)) {
      const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
      if (reasons[0]?.Code === 'ConditionalCheckFailed') throw Errors.GAME_ALREADY_LIKED();
    }
    throw err;
  }
};
