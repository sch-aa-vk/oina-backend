import { v4 as uuidv4 } from 'uuid';
import { UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GameVersionRecord, GameResponse } from '../../types/game.types';
import { docClient, GAMES_TABLE, GAME_VERSIONS_TABLE } from './_client';
import { getGameOrThrow, assertOwner, assertValidTransition, toGameResponse } from './_helpers';

export const unpublishGame = async (userId: string, gameId: string, changeLog?: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  assertValidTransition(game.visibility, 'draft');

  const now = new Date().toISOString();
  const newVersion = game.currentVersion + 1;

  const versionRecord: GameVersionRecord = {
    versionId: uuidv4(),
    gameId,
    userId,
    versionNumber: newVersion,
    changeLog: changeLog ?? 'Game unpublished',
    visibility: 'draft',
    createdAt: now,
  };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: 'SET visibility = :draft, updatedAt = :now, currentVersion = :newVersion',
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':draft': 'draft',
          ':now': now,
          ':newVersion': newVersion,
          ':userId': userId,
        },
      })
    ),
    docClient.send(
      new PutCommand({ TableName: GAME_VERSIONS_TABLE, Item: versionRecord })
    ),
  ]);

  const updated = await getGameOrThrow(gameId);
  return toGameResponse(updated);
};
