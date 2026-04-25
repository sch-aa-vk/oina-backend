import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, GAME_LIKES_TABLE } from './_client';
import { getGameOrThrow, isTransactionCancelledError } from './_helpers';

export const unlikeGame = async (userId: string, gameId: string): Promise<void> => {
  await getGameOrThrow(gameId);

  const likeKey = `${userId}#${gameId}`;

  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: GAME_LIKES_TABLE,
            Key: { likeKey },
            ConditionExpression: 'attribute_exists(likeKey)',
          },
        },
        {
          Update: {
            TableName: GAMES_TABLE,
            Key: { gameId },
            UpdateExpression: 'SET likeCount = likeCount - :one',
            ConditionExpression: 'likeCount > :zero',
            ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
          },
        },
      ],
    }));
  } catch (err: unknown) {
    if (isTransactionCancelledError(err)) {
      const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
      if (reasons[0]?.Code === 'ConditionalCheckFailed') throw Errors.GAME_NOT_LIKED();
    }
    throw err;
  }
};
