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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Str0ng!Pass',
              description: 'At least 8 chars with upper/lower/digit/special char.',
            },
          },
        },
        VerifyEmailRequest: {
          type: 'object',
          required: ['email', 'code'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            code: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
          },
        },
        EmailOnlyRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', example: 'Str0ng!Pass' },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'code', 'newPassword'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            code: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
            newPassword: {
              type: 'string',
              minLength: 8,
              example: 'N3w!StrongPass',
              description: 'At least 8 chars with upper/lower/digit/special char.',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            username: { type: 'string', nullable: true, example: 'alice' },
            displayName: { type: 'string', nullable: true, example: 'Alice' },
            bio: { type: 'string', nullable: true, example: 'Loves games and APIs.' },
            avatarUrl: { type: 'string', nullable: true, example: 'https://example.com/avatar.png' },
            isVerified: { type: 'boolean', example: true },
            totalGames: { type: 'number', example: 0 },
            gamesThisMonth: { type: 'number', example: 0 },
            currentMonthStart: { type: 'string', example: '2026-03' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-14T12:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-03-14T12:00:00.000Z' },
          },
        },
        SuccessEnvelope: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: 'Operation successful' },
            timestamp: { type: 'string', format: 'date-time', example: '2026-03-14T12:00:00.000Z' },
            data: { type: 'object', nullable: true },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Request validation failed' },
            details: {
              type: 'object',
              additionalProperties: true,
              example: { email: 'Email is required' },
            },
          },
        },
      },
    },
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' },
                example: { email: 'alice@example.com', password: 'Str0ng!Pass' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Registration accepted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Registration successful. Please check your email for a verification code.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: { email: 'alice@example.com' },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { password: 'Must be at least 8 characters' },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/verify-email': {
        post: {
          tags: ['Auth'],
          summary: 'Verify email code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifyEmailRequest' },
                example: { email: 'alice@example.com', code: '123456' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Email verified',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Email verified successfully. You can now log in.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: null,
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { code: 'Must be a 6-digit numeric code' },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/resend-verification-code': {
        post: {
          tags: ['Auth'],
          summary: 'Resend verification code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmailOnlyRequest' },
                example: { email: 'alice@example.com' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Code resent',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Verification code resent. Please check your email.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: { email: 'alice@example.com' },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { email: 'Must be a valid email address' },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
                example: { email: 'alice@example.com', password: 'Str0ng!Pass' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Authenticated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Login successful.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: {
                      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
                      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
                      user: {
                        userId: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121',
                        email: 'alice@example.com',
                        isVerified: true,
                        totalGames: 0,
                        gamesThisMonth: 0,
                        currentMonthStart: '2026-03',
                        createdAt: '2026-03-14T12:00:00.000Z',
                        updatedAt: '2026-03-14T12:00:00.000Z',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { email: 'Email is required' },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 401,
                    error: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                  },
                },
              },
            },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and blacklist token',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Logged out',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Logged out successfully.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: null,
                  },
                },
              },
            },
            '401': {
              description: 'Missing or invalid bearer token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 401,
                    error: 'TOKEN_MISSING',
                    message: 'Authorization token is required',
                  },
                },
              },
            },
          },
        },
      },
      '/auth/refresh-token': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
                example: { refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Access token refreshed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Access token refreshed.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newaccess' },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { refreshToken: 'refreshToken is required.' },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid refresh token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 401,
                    error: 'TOKEN_TYPE_MISMATCH',
                    message: 'Invalid token type',
                  },
                },
              },
            },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Send password reset code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmailOnlyRequest' },
                example: { email: 'alice@example.com' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Reset flow initiated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'If an account with that email exists, a password reset code has been sent.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: null,
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { email: 'Must be a valid email address' },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
                example: {
                  email: 'alice@example.com',
                  code: '123456',
                  newPassword: 'N3w!StrongPass',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Password reset complete',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Password reset successfully. You can now log in with your new password.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: null,
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 400,
                    error: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: { newPassword: 'Must be at least 8 characters' },
                  },
                },
              },
            },
            '404': {
              description: 'OTP not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 404,
                    error: 'OTP_NOT_FOUND',
                    message: 'No verification code found. Please request a new one',
                  },
                },
              },
            },
          },
        },
      },
      '/auth/validate-token': {
        post: {
          tags: ['Auth'],
          summary: 'Validate access token',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Token valid',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Token is valid.',
                    timestamp: '2026-03-14T12:00:00.000Z',
                    data: {
                      userId: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121',
                      email: 'alice@example.com',
                      isVerified: true,
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Missing or invalid bearer token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorEnvelope' },
                  example: {
                    statusCode: 401,
                    error: 'TOKEN_INVALID',
                    message: 'Invalid or malformed token',
                  },
                },
              },
            },
          },
        },
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
