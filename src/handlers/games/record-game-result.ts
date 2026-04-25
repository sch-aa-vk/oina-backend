import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { optionalAuth } from '../../middleware/auth.middleware';
import { recordGameResult } from '../../services/games';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { Errors } from '../../utils/errors';
import { RecordGameResultPayload } from '../../types/game.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await optionalAuth(event);
    const gameId = event.pathParameters?.gameId;
    if (!gameId) throw Errors.INVALID_GAME_PAYLOAD({ gameId: 'gameId path parameter is required' });

    const body = JSON.parse(event.body || '{}') as RecordGameResultPayload;

    const result = await recordGameResult(gameId, body, tokenPayload?.userId);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload?.userId ?? 'anonymous',
      gameId,
      operation: 'record-game-result',
    }));

    return lambdaResponse(201, successResponse(result, 'Result recorded'));
  });
};
