import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { getUserById } from '../../services/auth';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);

    const user = await getUserById(tokenPayload.userId);

    return lambdaResponse(200, successResponse({
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      isVerified: user?.isVerified ?? false,
    }, 'Token is valid.'));
  });
};
