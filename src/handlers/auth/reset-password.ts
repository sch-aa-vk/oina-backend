import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { resetPassword } from '../../services/auth';
import { validateResetPasswordPayload } from '../../utils/validators';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const body = JSON.parse(event.body || '{}');

    validateResetPasswordPayload(body);
    const { email, code, newPassword } = body as { email: string; code: string; newPassword: string };

    await resetPassword(email, code, newPassword);

    return lambdaResponse(200, successResponse(null, 'Password reset successfully. You can now log in with your new password.'));
  });
};
