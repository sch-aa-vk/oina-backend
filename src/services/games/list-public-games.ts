import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GameRecord, PublicGameListResponse, SortBy, GameType } from '../../types/game.types';
import { docClient, GAMES_TABLE } from './_client';
import { toGameSummaryResponse } from './_helpers';

const PAGE_SIZE = 20;

export const listPublicGames = async (params: {
  sortBy?: SortBy;
  category?: string;
  type?: GameType;
  cursor?: string;
}): Promise<PublicGameListResponse> => {
  const { sortBy = 'newest', category, type, cursor } = params;
  const exclusiveStartKey = cursor
    ? (JSON.parse(Buffer.from(cursor, 'base64').toString()) as Record<string, unknown>)
    : undefined;

  const filterParts: string[] = ['(attribute_not_exists(isDeleted) OR isDeleted = :notDeleted)'];
  const filterValues: Record<string, unknown> = { ':notDeleted': false };
  const filterNames: Record<string, string> = {};

  if (type) {
    filterParts.push('#gameType = :type');
    filterValues[':type'] = type;
    filterNames['#gameType'] = 'type';
  }

  let indexName: string;
  let keyCondition: string;
  const keyValues: Record<string, unknown> = { ...filterValues };

  if (sortBy === 'popular' && category) {
    indexName = 'category-likeCount-index';
    keyCondition = 'category = :category';
    keyValues[':category'] = category;
    filterParts.push('visibility = :visibility');
    keyValues[':visibility'] = 'public';
  } else if (sortBy === 'popular') {
    indexName = 'visibility-likeCount-index';
    keyCondition = 'visibility = :visibility';
    keyValues[':visibility'] = 'public';
  } else {
    indexName = 'visibility-createdAt-index';
    keyCondition = 'visibility = :visibility';
    keyValues[':visibility'] = 'public';
    if (category) {
      filterParts.push('category = :category');
      keyValues[':category'] = category;
    }
  }

  const filterExpression = filterParts.join(' AND ');

  const result = await docClient.send(new QueryCommand({
    TableName: GAMES_TABLE,
    IndexName: indexName,
    KeyConditionExpression: keyCondition,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: keyValues,
    ...(Object.keys(filterNames).length > 0 ? { ExpressionAttributeNames: filterNames } : {}),
    ScanIndexForward: false,
    Limit: PAGE_SIZE,
    ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
  }));

  const games = await Promise.all((result.Items ?? []).map(item => toGameSummaryResponse(item as GameRecord)));
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return { games, nextCursor };
};
