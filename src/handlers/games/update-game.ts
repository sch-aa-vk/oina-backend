import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { updateGame } from '../../services/games';
import { validateUpdateGamePayload } from '../../utils/game-validators';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { UpdateGamePayload } from '../../types/game.types';
import { Errors } from '../../utils/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const gameId = event.pathParameters?.gameId;
    if (!gameId) throw Errors.INVALID_GAME_PAYLOAD({ gameId: 'gameId path parameter is required' });

    const body = JSON.parse(event.body || '{}') as Partial<UpdateGamePayload>;
    validateUpdateGamePayload(body);

    const game = await updateGame(tokenPayload.userId, gameId, body as UpdateGamePayload);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      gameId,
      operation: 'update-game',
    }));

    return lambdaResponse(200, successResponse(game, 'Game updated'));
  });
};
