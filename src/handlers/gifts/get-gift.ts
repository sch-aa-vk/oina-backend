import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getGift } from '../../services/gifts/get-gift';
import { withErrorHandler, lambdaResponse } from '../handler.utils';
import { successResponse } from '../../types/responses.types';
import { AppError } from '../../utils/errors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return withErrorHandler(async () => {
    const giftId = event.pathParameters?.giftId;
    if (!giftId) {
      throw new AppError(400, 'MISSING_GIFT_ID', 'giftId path parameter is required');
    }

    const result = await getGift(giftId);

    return lambdaResponse(200, successResponse(result, 'Gift retrieved', 200));
  });
};
