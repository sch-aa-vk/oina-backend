import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'OINA Backend API',
      version: '1.0.0',
      description: 'Authentication API for OINA backend.',
    },
    servers: [{ url: '/' }],
    tags: [{ name: 'Auth' }],
    paths: {
      '/auth/register': {
        post: { tags: ['Auth'], summary: 'Register a user', responses: { '200': { description: 'OK' } } },
      },
      '/auth/verify-email': {
        post: { tags: ['Auth'], summary: 'Verify email code', responses: { '200': { description: 'OK' } } },
      },
      '/auth/resend-verification-code': {
        post: { tags: ['Auth'], summary: 'Resend verification code', responses: { '200': { description: 'OK' } } },
      },
      '/auth/login': {
        post: { tags: ['Auth'], summary: 'Login', responses: { '200': { description: 'OK' } } },
      },
      '/auth/logout': {
        post: { tags: ['Auth'], summary: 'Logout and blacklist token', responses: { '200': { description: 'OK' } } },
      },
      '/auth/refresh-token': {
        post: { tags: ['Auth'], summary: 'Refresh access token', responses: { '200': { description: 'OK' } } },
      },
      '/auth/forgot-password': {
        post: { tags: ['Auth'], summary: 'Send password reset code', responses: { '200': { description: 'OK' } } },
      },
      '/auth/reset-password': {
        post: { tags: ['Auth'], summary: 'Reset password', responses: { '200': { description: 'OK' } } },
      },
      '/auth/validate-token': {
        post: { tags: ['Auth'], summary: 'Validate access token', responses: { '200': { description: 'OK' } } },
      },
      '/docs': {
        get: { summary: 'Swagger UI', responses: { '200': { description: 'OK' } } },
      },
      '/openapi.json': {
        get: { summary: 'OpenAPI spec JSON', responses: { '200': { description: 'OK' } } },
      },
    },
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
    body: JSON.stringify(openApiSpec),
  };
};
