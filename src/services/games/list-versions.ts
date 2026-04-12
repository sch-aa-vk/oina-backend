import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GameVersionRecord, VersionResponse } from '../../types/game.types';
import { docClient, GAME_VERSIONS_TABLE } from './_client';
import { getGameOrThrow, assertOwner } from './_helpers';

export const listGameVersions = async (userId: string, gameId: string): Promise<VersionResponse[]> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: GAME_VERSIONS_TABLE,
      IndexName: 'gameId-createdAt-index',
      KeyConditionExpression: 'gameId = :gameId',
      ExpressionAttributeValues: { ':gameId': gameId },
      ScanIndexForward: false,
    })
  );

  return (result.Items ?? []).map((item) => {
    const v = item as GameVersionRecord;
    return {
      versionId: v.versionId,
      gameId: v.gameId,
      versionNumber: v.versionNumber,
      changeLog: v.changeLog,
      visibility: v.visibility,
      createdAt: v.createdAt,
    };
  });
};
