import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { blacklistToken } from '../../services/token';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);

    const authHeader = event.headers['Authorization'] || event.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    await blacklistToken(token, tokenPayload.userId);

    return lambdaResponse(200, successResponse(null, 'Logged out successfully.'));
  });
};
