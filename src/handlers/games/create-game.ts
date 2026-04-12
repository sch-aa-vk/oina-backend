import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { createGame } from '../../services/games';
import { validateCreateGamePayload } from '../../utils/game-validators';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { CreateGamePayload } from '../../types/game.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const body = JSON.parse(event.body || '{}') as Partial<CreateGamePayload>;

    validateCreateGamePayload(body);

    const game = await createGame(tokenPayload.userId, body as CreateGamePayload);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      gameId: game.gameId,
      operation: 'create-game',
    }));

    return lambdaResponse(201, successResponse(game, 'Game created', 201));
  });
};
