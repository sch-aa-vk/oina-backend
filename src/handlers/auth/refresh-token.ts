import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { refreshAccessToken } from '../../services/token';
import { Errors } from '../../utils/errors';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw Errors.VALIDATION_ERROR({ refreshToken: 'refreshToken is required.' });
    }

    const accessToken = await refreshAccessToken(refreshToken);

    return lambdaResponse(200, successResponse({ accessToken }, 'Access token refreshed.'));
  });
};
