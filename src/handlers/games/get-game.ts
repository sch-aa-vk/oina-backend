import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { getUserGame } from '../../services/games';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { Errors } from '../../utils/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const gameId = event.pathParameters?.gameId;
    if (!gameId) throw Errors.INVALID_GAME_PAYLOAD({ gameId: 'gameId path parameter is required' });

    const game = await getUserGame(tokenPayload.userId, gameId);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      gameId,
      operation: 'get-game',
    }));

    return lambdaResponse(200, successResponse(game, 'Game retrieved'));
  });
};
