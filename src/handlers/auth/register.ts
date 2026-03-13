import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { register } from '../../services/auth.service';
import { validateRegisterPayload } from '../../utils/validators';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const body = JSON.parse(event.body || '{}');

    validateRegisterPayload(body);
    const { email, password } = body as { email: string; password: string };

    await register(email, password);

    return lambdaResponse(
      200,
      successResponse({ email }, 'Registration successful. Please check your email for a verification code.')
    );
  });
};
