import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { login } from '../../services/auth.service';
import { validateLoginPayload } from '../../utils/validators';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const body = JSON.parse(event.body || '{}');

    validateLoginPayload(body);
    const { email, password } = body as { email: string; password: string };

    const result = await login(email, password);

    return lambdaResponse(200, successResponse({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
    }, 'Login successful.'));
  });
};
