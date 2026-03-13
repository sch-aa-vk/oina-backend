export interface ApiResponse<T = unknown> {
  statusCode: number;
  data?: T;
  message: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export const successResponse = <T>(data: T, message = 'Operation successful', statusCode = 200): ApiResponse<T> => ({
  statusCode,
  data,
  message,
  timestamp: new Date().toISOString(),
});

export const errorResponse = (
  statusCode: number,
  error: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse => ({
  statusCode,
  error,
  message,
  ...(details ? { details } : {}),
});

export const lambdaResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});
