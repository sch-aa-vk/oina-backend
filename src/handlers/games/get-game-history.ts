import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { getGameHistory } from '../../services/games';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);

    const history = await getGameHistory(tokenPayload.userId);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      operation: 'get-game-history',
    }));

    return lambdaResponse(200, successResponse(history, 'Game history retrieved'));
  });
};
