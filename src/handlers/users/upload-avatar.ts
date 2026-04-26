import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { generateAvatarUploadUrl, AvatarContentType } from '../../services/profile';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const body = JSON.parse(event.body || '{}') as { contentType?: string };

    const result = await generateAvatarUploadUrl(
      tokenPayload.userId,
      body.contentType as AvatarContentType
    );

    console.log(JSON.stringify({
      requestId: event.requestContext?.requestId,
      userId: tokenPayload.userId,
      operation: 'upload-avatar',
    }));

    return lambdaResponse(200, successResponse(result, 'Avatar upload URL generated'));
  });
};
