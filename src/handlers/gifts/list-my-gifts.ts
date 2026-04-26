import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { listMyGifts } from '../../services/gifts/list-my-gifts';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const cursor = event.queryStringParameters?.cursor;

    const result = await listMyGifts(tokenPayload.userId, cursor);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      operation: 'list-my-gifts',
    }));

    return lambdaResponse(200, successResponse(result, 'Gifts retrieved'));
  });
};
