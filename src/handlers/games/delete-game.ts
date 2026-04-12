import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { deleteGame } from '../../services/games.service';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { Errors } from '../../utils/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const gameId = event.pathParameters?.gameId;
    if (!gameId) throw Errors.INVALID_GAME_PAYLOAD({ gameId: 'gameId path parameter is required' });

    await deleteGame(tokenPayload.userId, gameId);
    // TODO (Phase 3.2): delete all reward media assets for this game from S3

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      gameId,
      operation: 'delete-game',
    }));

    return lambdaResponse(200, successResponse(null, 'Game deleted'));
  });
};
