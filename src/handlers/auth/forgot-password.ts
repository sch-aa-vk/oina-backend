import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { forgotPassword } from '../../services/auth';
import { validateEmail } from '../../utils/validators';
import { Errors } from '../../utils/errors';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    if (!email) throw Errors.VALIDATION_ERROR({ email: 'Email is required.' });
    validateEmail(email);

    await forgotPassword(email);

    return lambdaResponse(200, successResponse(null, 'If an account with that email exists, a password reset code has been sent.'));
  });
};
