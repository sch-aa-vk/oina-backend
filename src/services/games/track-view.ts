import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GAMES_TABLE, GAME_VIEWS_TABLE, VIEW_COOLDOWN_SECONDS } from './_client';

export const trackGameView = async (gameId: string, userId?: string): Promise<void> => {
  if (!userId) {
    await docClient.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { gameId },
      UpdateExpression: 'SET viewCount = viewCount + :one',
      ExpressionAttributeValues: { ':one': 1 },
    }));
    return;
  }

  const viewKey = `${userId}#${gameId}`;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + VIEW_COOLDOWN_SECONDS;

  try {
    await docClient.send(new PutCommand({
      TableName: GAME_VIEWS_TABLE,
      Item: { viewKey, expiresAt },
      ConditionExpression: 'attribute_not_exists(viewKey) OR expiresAt <= :now',
      ExpressionAttributeValues: { ':now': now },
    }));
  } catch (err: unknown) {
    const isConditionFailed =
      typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'ConditionalCheckFailedException';
    if (isConditionFailed) return;
    throw err;
  }

  await docClient.send(new UpdateCommand({
    TableName: GAMES_TABLE,
    Key: { gameId },
    UpdateExpression: 'SET viewCount = viewCount + :one',
    ExpressionAttributeValues: { ':one': 1 },
  }));
};
