import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { generateGift } from '../../services/gifts/generate-gift';
import { validateGenerateGiftPayload } from '../../utils/gift-validators';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { GenerateGiftPayload } from '../../types/gift.types';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const body = JSON.parse(event.body || '{}') as Partial<GenerateGiftPayload>;

    validateGenerateGiftPayload(body);

    const result = await generateGift(tokenPayload.userId, body as GenerateGiftPayload);

    return lambdaResponse(201, successResponse(result, 'Gift generated', 201));
  });
};
