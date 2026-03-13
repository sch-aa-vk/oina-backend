import { APIGatewayProxyResult } from 'aws-lambda';
import { AppError } from '../utils/errors';
import { lambdaResponse, successResponse, errorResponse } from '../types/responses.types';

export const withErrorHandler = async (
  fn: () => Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) {
      return lambdaResponse(
        err.statusCode,
        errorResponse(err.statusCode, err.errorCode, err.message, err.details)
      );
    }

    console.error('Unhandled error:', err);

    return lambdaResponse(
      500,
      errorResponse(500, 'INTERNAL_ERROR', 'An internal server error occurred')
    );
  }
};

export { lambdaResponse, successResponse };
