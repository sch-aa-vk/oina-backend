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
    tags: [{ name: 'Auth' }, { name: 'Games' }],
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
        // ── Games schemas ─────────────────────────────────────────────────────
        ScoringConfig: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', example: true },
            maxScore: { type: 'number', nullable: true, example: 1000 },
          },
          required: ['enabled'],
        },
        Reward: {
          type: 'object',
          required: ['id', 'pointsThreshold', 'label', 'type'],
          properties: {
            id: { type: 'string', example: 'reward-1' },
            pointsThreshold: { type: 'number', minimum: 0, maximum: 100000, example: 500 },
            label: { type: 'string', minLength: 1, maxLength: 80, example: 'Well done!' },
            type: { type: 'string', enum: ['text', 'image', 'video', 'audio'], example: 'text' },
            text: { type: 'string', maxLength: 2000, nullable: true, example: 'You scored amazing! 🎉', description: 'Required for text rewards' },
          },
        },
        CreateGameRequest: {
          type: 'object',
          required: ['type', 'title', 'content'],
          properties: {
            type: { type: 'string', enum: ['choose-me', 'guess-by-emoji', 'crossword'], example: 'choose-me' },
            title: { type: 'string', minLength: 1, maxLength: 120, example: 'How well do you know me?' },
            description: { type: 'string', maxLength: 1000, nullable: true, example: 'Birthday surprise game' },
            category: { type: 'string', nullable: true, example: 'quiz' },
            tags: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 30 }, maxItems: 10, example: ['birthday', 'friends'] },
            content: {
              type: 'object',
              required: [],
              properties: {
                scoring: { $ref: '#/components/schemas/ScoringConfig', nullable: true },
                rewards: { type: 'array', items: { $ref: '#/components/schemas/Reward' }, maxItems: 5, nullable: true },
              },
              additionalProperties: true,
              example: { questions: [], scoring: { enabled: true, maxScore: 100 }, rewards: [{ id: 'r1', pointsThreshold: 50, label: 'Good job!', type: 'text', text: 'Nice work!' }] },
            },
          },
        },
        UpdateGameRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 120, example: 'Updated title' },
            description: { type: 'string', maxLength: 1000, nullable: true },
            category: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 30 }, maxItems: 10 },
            content: { type: 'object', additionalProperties: true },
            changeLog: { type: 'string', nullable: true, example: 'Added more questions' },
          },
        },
        PublishGameRequest: {
          type: 'object',
          required: ['visibility'],
          properties: {
            visibility: { type: 'string', enum: ['private-link', 'public'], example: 'public' },
            changeLog: { type: 'string', nullable: true, example: 'Initial publish' },
          },
        },
        GameResponse: {
          type: 'object',
          properties: {
            gameId: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            userId: { type: 'string', example: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121' },
            type: { type: 'string', enum: ['choose-me', 'guess-by-emoji', 'crossword'] },
            title: { type: 'string', example: 'How well do you know me?' },
            description: { type: 'string', nullable: true },
            thumbnail: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['draft', 'private-link', 'public'], example: 'draft' },
            content: { type: 'object', additionalProperties: true },
            publishedAt: { type: 'string', format: 'date-time', nullable: true },
            shareLink: { type: 'string', nullable: true },
            viewCount: { type: 'number', example: 0 },
            playCount: { type: 'number', example: 0 },
            likeCount: { type: 'number', example: 0 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            currentVersion: { type: 'number', example: 1 },
          },
        },
        GameListResponse: {
          type: 'object',
          properties: {
            games: { type: 'array', items: { $ref: '#/components/schemas/GameResponse' } },
            nextCursor: { type: 'string', nullable: true, example: null },
          },
        },
        VersionResponse: {
          type: 'object',
          properties: {
            versionId: { type: 'string', example: 'abc123' },
            gameId: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            versionNumber: { type: 'number', example: 2 },
            changeLog: { type: 'string', example: 'Added more questions' },
            visibility: { type: 'string', enum: ['draft', 'private-link', 'public'] },
            createdAt: { type: 'string', format: 'date-time' },
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
      // ── Games endpoints ─────────────────────────────────────────────────────
      '/games': {
        post: {
          tags: ['Games'],
          summary: 'Create a new game',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateGameRequest' },
                example: {
                  type: 'choose-me',
                  title: 'How well do you know me?',
                  description: 'Birthday surprise game',
                  category: 'quiz',
                  tags: ['birthday', 'friends'],
                  content: {
                    questions: [],
                    scoring: { enabled: true, maxScore: 100 },
                    rewards: [{ id: 'r1', pointsThreshold: 50, label: 'Good job!', type: 'text', text: 'Nice work!' }],
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Game created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } },
            },
            '400': { description: 'Validation error, invalid reward payload, or content too large', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '409': { description: 'Quota exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
        get: {
          tags: ['Games'],
          summary: 'List all games for the authenticated user',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'cursor', in: 'query', required: false, schema: { type: 'string' }, description: 'Pagination cursor' },
          ],
          responses: {
            '200': {
              description: 'List of games',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}': {
        get: {
          tags: ['Games'],
          summary: 'Get a specific game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Game data', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
        put: {
          tags: ['Games'],
          summary: 'Update a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateGameRequest' } } },
          },
          responses: {
            '200': { description: 'Updated game', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
        delete: {
          tags: ['Games'],
          summary: 'Delete a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}/publish': {
        post: {
          tags: ['Games'],
          summary: 'Publish a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublishGameRequest' }, example: { visibility: 'public' } } },
          },
          responses: {
            '200': { description: 'Published', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '400': { description: 'Invalid transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}/unpublish': {
        post: {
          tags: ['Games'],
          summary: 'Unpublish a game (set to draft)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { changeLog: { type: 'string' } } } } },
          },
          responses: {
            '200': { description: 'Unpublished', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '400': { description: 'Invalid transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}/preview': {
        get: {
          tags: ['Games'],
          summary: 'Preview a draft game (owner only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Draft game content', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '400': { description: 'Game is not a draft', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}/versions': {
        get: {
          tags: ['Games'],
          summary: 'List version history for a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'List of versions', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
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
