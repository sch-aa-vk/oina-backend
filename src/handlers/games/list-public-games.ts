import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listPublicGames } from '../../services/games';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { SortBy, GameType } from '../../types/game.types';

const VALID_SORT: SortBy[] = ['newest', 'popular'];
const VALID_TYPES: GameType[] = ['choose-me', 'guess-by-emoji', 'crossword'];

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const qs = event.queryStringParameters ?? {};

    const sortBy = (VALID_SORT.includes(qs.sortBy as SortBy) ? qs.sortBy : 'popular') as SortBy;
    const type = VALID_TYPES.includes(qs.type as GameType) ? (qs.type as GameType) : undefined;
    const category = qs.category ?? undefined;
    const search = qs.search ?? undefined;
    const cursor = qs.cursor ?? undefined;

    const result = await listPublicGames({ sortBy, category, type, search, cursor });

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      operation: 'list-public-games',
      sortBy,
      category,
      type,
      search,
      count: result.games.length,
    }));

    return lambdaResponse(200, successResponse(result, 'Public games retrieved'));
  });
};
