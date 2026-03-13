import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyEmail } from '../../services/auth.service';
import { validateEmail, validateOTPCode } from '../../utils/validators';
import { Errors } from '../../utils/errors';
import { successResponse, lambdaResponse, withErrorHandler } from '../handler.utils';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const body = JSON.parse(event.body || '{}');
    const { email, code } = body;

    if (!email) throw Errors.VALIDATION_ERROR({ email: 'Email is required.' });
    if (!code) throw Errors.VALIDATION_ERROR({ code: 'Code is required.' });
    validateEmail(email);
    validateOTPCode(code);

    await verifyEmail(email, code);

    return lambdaResponse(200, successResponse(null, 'Email verified successfully. You can now log in.'));
  });
};
