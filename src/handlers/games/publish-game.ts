import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { publishGame } from '../../services/games';
import { validatePublishGamePayload } from '../../utils/game-validators';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { PublishGamePayload } from '../../types/game.types';
import { Errors } from '../../utils/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const gameId = event.pathParameters?.gameId;
    if (!gameId) throw Errors.INVALID_GAME_PAYLOAD({ gameId: 'gameId path parameter is required' });

    const body = JSON.parse(event.body || '{}') as Partial<PublishGamePayload>;
    validatePublishGamePayload(body);

    const game = await publishGame(tokenPayload.userId, gameId, body as PublishGamePayload);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      gameId,
      operation: 'publish-game',
      visibility: body.visibility,
    }));

    return lambdaResponse(200, successResponse(game, 'Game published'));
  });
};
