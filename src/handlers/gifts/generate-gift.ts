import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { requireAuth } from '../../middleware/auth.middleware';
import { initGift } from '../../services/gifts/generate-gift';
import { validateGenerateGiftPayload } from '../../utils/gift-validators';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { GenerateGiftPayload } from '../../types/gift.types';

const lambdaClient = new LambdaClient({});
const WORKER_FUNCTION_NAME = process.env.WORKER_FUNCTION_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const tokenPayload = await requireAuth(event);
    const body = JSON.parse(event.body || '{}') as Partial<GenerateGiftPayload>;

    validateGenerateGiftPayload(body);

    const giftId = crypto.randomUUID();
    await initGift(tokenPayload.userId, giftId, body as GenerateGiftPayload);

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WORKER_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload: JSON.stringify({ giftId, userId: tokenPayload.userId, payload: body }),
    }));

    return lambdaResponse(202, successResponse({ giftId }, 'Gift generation started', 202));
  });
};
