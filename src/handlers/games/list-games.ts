import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { listUserGames } from '../../services/games';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const cursor = event.queryStringParameters?.cursor ?? undefined;

    const result = await listUserGames(tokenPayload.userId, cursor);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      operation: 'list-games',
      count: result.games.length,
    }));

    return lambdaResponse(200, successResponse(result, 'Games retrieved'));
  });
};
