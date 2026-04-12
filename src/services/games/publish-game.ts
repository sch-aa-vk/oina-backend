import { v4 as uuidv4 } from 'uuid';
import { UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PublishGamePayload, GameVersionRecord, GameResponse } from '../../types/game.types';
import { docClient, GAMES_TABLE, GAME_VERSIONS_TABLE } from './_client';
import { getGameOrThrow, assertOwner, assertValidTransition, toGameResponse } from './_helpers';

export const publishGame = async (
  userId: string,
  gameId: string,
  payload: PublishGamePayload
): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  assertValidTransition(game.visibility, payload.visibility);

  const now = new Date().toISOString();
  const newVersion = game.currentVersion + 1;
  const shareLink = game.shareLink ?? uuidv4();
  const publishedAt = game.publishedAt ?? now;

  const updateExpressionParts = [
    'visibility = :visibility',
    'shareLink = :shareLink',
    'publishedAt = :publishedAt',
    'updatedAt = :now',
    'currentVersion = :newVersion',
  ];
  const expressionAttributeValues: Record<string, unknown> = {
    ':visibility': payload.visibility,
    ':shareLink': shareLink,
    ':publishedAt': publishedAt,
    ':now': now,
    ':newVersion': newVersion,
    ':userId': userId,
  };

  const versionRecord: GameVersionRecord = {
    versionId: uuidv4(),
    gameId,
    userId,
    versionNumber: newVersion,
    changeLog: payload.changeLog ?? `Published as ${payload.visibility}`,
    visibility: payload.visibility,
    createdAt: now,
  };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: expressionAttributeValues,
      })
    ),
    docClient.send(
      new PutCommand({ TableName: GAME_VERSIONS_TABLE, Item: versionRecord })
    ),
  ]);

  const updated = await getGameOrThrow(gameId);
  return toGameResponse(updated);
};
