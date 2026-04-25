import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { optionalAuth } from '../../middleware/auth.middleware';
import { trackGameView } from '../../services/games';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { Errors } from '../../utils/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await optionalAuth(event);
    const gameId = event.pathParameters?.gameId;
    if (!gameId) throw Errors.INVALID_GAME_PAYLOAD({ gameId: 'gameId path parameter is required' });

    await trackGameView(gameId, tokenPayload?.userId);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload?.userId ?? 'anonymous',
      gameId,
      operation: 'track-view',
    }));

    return lambdaResponse(200, successResponse(null, 'View recorded'));
  });
};
