import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { updateCurrentUserProfile } from '../../services/profile';
import { validateProfileUpdatePayload } from '../../utils/validators';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { UpdateProfilePayload } from '../../types/user.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const body = JSON.parse(event.body || '{}') as Partial<UpdateProfilePayload>;

    validateProfileUpdatePayload(body);

    const profile = await updateCurrentUserProfile(tokenPayload.userId, body);

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      operation: 'update-profile',
    }));

    return lambdaResponse(200, successResponse(profile, 'Profile updated'));
  });
};
