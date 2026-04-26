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
    tags: [{ name: 'Auth' }, { name: 'Users' }, { name: 'Games' }, { name: 'Gifts' }],
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
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            displayName: { type: 'string', minLength: 1, maxLength: 100, nullable: true, example: 'Alice' },
            bio: { type: 'string', maxLength: 500, nullable: true, example: 'Loves games and APIs.' },
            username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$', nullable: true, example: 'alice_42' },
          },
        },
        AvatarUploadRequest: {
          type: 'object',
          required: ['contentType'],
          properties: {
            contentType: {
              type: 'string',
              enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
              example: 'image/jpeg',
            },
          },
        },
        AvatarUploadResponse: {
          type: 'object',
          properties: {
            presignedUrl: { type: 'string', example: 'https://oina-avatars-dev.s3.amazonaws.com/avatars/user-id?X-Amz-...' },
            avatarUrl: { type: 'string', example: 'https://oina-avatars-dev.s3.amazonaws.com/avatars/user-id' },
          },
        },
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
            coverImageContentType: {
              type: 'string',
              enum: ['image/jpeg', 'image/png', 'image/webp'],
              nullable: true,
              example: 'image/jpeg',
              description: 'If provided, a presigned upload URL is returned in coverUploadUrl',
            },
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
            coverImageContentType: {
              type: 'string',
              enum: ['image/jpeg', 'image/png', 'image/webp'],
              nullable: true,
              example: 'image/jpeg',
              description: 'If provided, a presigned upload URL is returned in coverUploadUrl',
            },
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
            isLikedByCurrentUser: { type: 'boolean', nullable: true, example: false },
            isDeleted: { type: 'boolean', nullable: true, example: false },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
            coverUploadUrl: { type: 'string', nullable: true, description: 'Presigned S3 PUT URL, present only when coverImageContentType was provided in the request' },
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
        GameSummaryResponse: {
          type: 'object',
          description: 'Lightweight game representation used in public listings',
          properties: {
            gameId: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            userId: { type: 'string', example: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121' },
            authorName: { type: 'string', nullable: true, example: 'alice' },
            type: { type: 'string', enum: ['choose-me', 'guess-by-emoji', 'crossword'] },
            title: { type: 'string', example: 'How well do you know me?' },
            description: { type: 'string', nullable: true },
            thumbnail: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['draft', 'private-link', 'public'] },
            publishedAt: { type: 'string', format: 'date-time', nullable: true },
            shareLink: { type: 'string', nullable: true },
            viewCount: { type: 'number', example: 42 },
            playCount: { type: 'number', example: 10 },
            likeCount: { type: 'number', example: 5 },
            isLikedByCurrentUser: { type: 'boolean', nullable: true, example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            isDeleted: { type: 'boolean', nullable: true, example: false },
          },
        },
        PublicGameListResponse: {
          type: 'object',
          properties: {
            games: { type: 'array', items: { $ref: '#/components/schemas/GameSummaryResponse' } },
            nextCursor: { type: 'string', nullable: true, example: null },
          },
        },
        RecordGameResultRequest: {
          type: 'object',
          required: ['duration', 'completionStatus'],
          properties: {
            score: { type: 'number', nullable: true, example: 80 },
            maxScore: { type: 'number', nullable: true, example: 100 },
            outcomeId: { type: 'string', nullable: true, example: 'outcome-42' },
            duration: { type: 'number', description: 'Duration in seconds', example: 120 },
            completionStatus: { type: 'string', enum: ['completed', 'abandoned'], example: 'completed' },
          },
        },
        GameResultResponse: {
          type: 'object',
          properties: {
            gameResultId: { type: 'string', example: 'abc123' },
            gameId: { type: 'string', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
            gameTitle: { type: 'string', nullable: true, example: 'How well do you know me?' },
            isGameDeleted: { type: 'boolean', nullable: true, example: false },
            score: { type: 'number', nullable: true, example: 80 },
            maxScore: { type: 'number', nullable: true, example: 100 },
            outcomeId: { type: 'string', nullable: true, example: 'outcome-42' },
            duration: { type: 'number', example: 120 },
            completionStatus: { type: 'string', enum: ['completed', 'abandoned'], example: 'completed' },
            playedAt: { type: 'string', format: 'date-time', example: '2026-04-27T10:00:00.000Z' },
          },
        },
        GameHistoryResponse: {
          type: 'object',
          properties: {
            results: { type: 'array', items: { $ref: '#/components/schemas/GameResultResponse' } },
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
        GenerateGiftRequest: {
          type: 'object',
          required: [
            'recipientName', 'occasion', 'personalMessage', 'tone',
            'themeName', 'themeDirection', 'templateLabel', 'templateBlueprint',
            'variationLabel', 'variationBlueprint', 'variationDescription',
          ],
          properties: {
            recipientName: { type: 'string', example: 'Bob' },
            occasion: { type: 'string', example: 'Birthday' },
            personalMessage: { type: 'string', example: 'Wishing you a wonderful day!' },
            tone: { type: 'string', example: 'warm' },
            themeName: { type: 'string', example: 'Celebration' },
            themeDirection: { type: 'string', example: 'festive and joyful' },
            templateLabel: { type: 'string', example: 'Classic Card' },
            templateBlueprint: { type: 'string', example: 'template-v1' },
            variationLabel: { type: 'string', example: 'Confetti' },
            variationBlueprint: { type: 'string', example: 'variation-confetti' },
            variationDescription: { type: 'string', example: 'Colorful confetti animation on a white background' },
          },
        },
        GiftRecord: {
          type: 'object',
          properties: {
            giftId: { type: 'string', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
            userId: { type: 'string', example: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121' },
            recipientName: { type: 'string', example: 'Bob' },
            occasion: { type: 'string', example: 'Birthday' },
            s3Key: { type: 'string', example: 'gifts/d290f1ee-6c54-4b01-90e6-d701748f0851.html' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-27T10:00:00.000Z' },
            status: { type: 'string', enum: ['GENERATING', 'READY', 'ERROR'], example: 'READY' },
            errorMessage: { type: 'string', nullable: true },
          },
        },
        GiftListResponse: {
          type: 'object',
          properties: {
            gifts: { type: 'array', items: { $ref: '#/components/schemas/GiftRecord' } },
            nextCursor: { type: 'string', nullable: true, example: null },
          },
        },
        GetGiftResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['GENERATING', 'READY', 'ERROR'], example: 'READY' },
            html: { type: 'string', nullable: true, description: 'Rendered HTML content, present only when status is READY' },
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
      '/users/me': {
        get: {
          tags: ['Users'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Profile retrieved',
                    timestamp: '2026-04-18T10:00:00.000Z',
                    data: {
                      userId: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121',
                      email: 'alice@example.com',
                      username: 'alice',
                      displayName: 'Alice',
                      bio: 'Loves games.',
                      avatarUrl: 'https://example.com/avatar.png',
                      isVerified: true,
                      totalGames: 2,
                      gamesThisMonth: 1,
                      currentMonthStart: '2026-04',
                      createdAt: '2026-04-01T10:00:00.000Z',
                      updatedAt: '2026-04-18T10:00:00.000Z',
                    },
                  },
                },
              },
            },
            '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
        patch: {
          tags: ['Users'],
          summary: 'Update current user profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
                example: { displayName: 'New Name', bio: 'Updated bio' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Updated profile',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Profile updated',
                    timestamp: '2026-04-18T10:05:00.000Z',
                    data: {
                      userId: '9f31ce1d-6d0a-4973-99ed-e5fd755f8121',
                      email: 'alice@example.com',
                      displayName: 'New Name',
                      bio: 'Updated bio',
                      avatarUrl: 'https://example.com/avatar.png',
                      isVerified: true,
                      totalGames: 2,
                      gamesThisMonth: 1,
                      currentMonthStart: '2026-04',
                      createdAt: '2026-04-01T10:00:00.000Z',
                      updatedAt: '2026-04-18T10:05:00.000Z',
                    },
                  },
                },
              },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '409': { description: 'Username taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/users/me/avatar': {
        post: {
          tags: ['Users'],
          summary: 'Get a presigned S3 URL to upload a profile image',
          description: 'Returns a presigned PUT URL. Client must PUT the image file directly to that URL with the matching Content-Type header. The avatarUrl is pre-set on the user record and returned immediately.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AvatarUploadRequest' },
                example: { contentType: 'image/jpeg' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Presigned URL generated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Avatar upload URL generated',
                    timestamp: '2026-04-18T10:00:00.000Z',
                    data: {
                      presignedUrl: 'https://oina-avatars-dev.s3.amazonaws.com/avatars/user-id?X-Amz-...',
                      avatarUrl: 'https://oina-avatars-dev.s3.amazonaws.com/avatars/user-id',
                    },
                  },
                },
              },
            },
            '400': { description: 'Invalid contentType', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
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
      '/games/public': {
        get: {
          tags: ['Games'],
          summary: 'List publicly visible games',
          description: 'Returns published games sorted by popularity or recency. Auth is optional — when provided, isLikedByCurrentUser is populated.',
          parameters: [
            {
              name: 'sortBy',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['newest', 'popular'], default: 'popular' },
              description: 'Sort order',
            },
            {
              name: 'type',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['choose-me', 'guess-by-emoji', 'crossword'] },
              description: 'Filter by game type',
            },
            { name: 'category', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by category' },
            { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Full-text search on title' },
            { name: 'cursor', in: 'query', required: false, schema: { type: 'string' }, description: 'Pagination cursor' },
          ],
          responses: {
            '200': {
              description: 'Public game list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Public games retrieved',
                    timestamp: '2026-04-27T10:00:00.000Z',
                    data: { games: [], nextCursor: null },
                  },
                },
              },
            },
          },
        },
      },
      '/games/history': {
        get: {
          tags: ['Games'],
          summary: 'Get the authenticated user\'s game play history',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Play history',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Game history retrieved',
                    timestamp: '2026-04-27T10:00:00.000Z',
                    data: { results: [], nextCursor: null },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}': {
        get: {
          tags: ['Games'],
          summary: 'Get a specific game',
          description: 'Auth is optional — when provided, isLikedByCurrentUser is populated and the owner can access draft games.',
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
      '/games/{gameId}/restore': {
        post: {
          tags: ['Games'],
          summary: 'Restore a soft-deleted game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Game restored', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
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
      '/games/{gameId}/play': {
        post: {
          tags: ['Games'],
          summary: 'Record a game play result',
          description: 'Auth is optional — anonymous plays are recorded without a userId.',
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecordGameResultRequest' },
                example: { score: 80, maxScore: 100, duration: 120, completionStatus: 'completed' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Result recorded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 201,
                    message: 'Result recorded',
                    timestamp: '2026-04-27T10:00:00.000Z',
                    data: {
                      gameResultId: 'abc123',
                      gameId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                      gameTitle: 'How well do you know me?',
                      score: 80,
                      maxScore: 100,
                      duration: 120,
                      completionStatus: 'completed',
                      playedAt: '2026-04-27T10:00:00.000Z',
                    },
                  },
                },
              },
            },
            '404': { description: 'Game not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}/like': {
        post: {
          tags: ['Games'],
          summary: 'Like a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Game liked',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: { statusCode: 200, message: 'Game liked', timestamp: '2026-04-27T10:00:00.000Z', data: null },
                },
              },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Game not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
        delete: {
          tags: ['Games'],
          summary: 'Unlike a game',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Game unliked',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: { statusCode: 200, message: 'Game unliked', timestamp: '2026-04-27T10:00:00.000Z', data: null },
                },
              },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '404': { description: 'Game not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/games/{gameId}/view': {
        post: {
          tags: ['Games'],
          summary: 'Track a game view',
          description: 'Auth is optional — anonymous views are counted without a userId.',
          parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'View recorded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: { statusCode: 200, message: 'View recorded', timestamp: '2026-04-27T10:00:00.000Z', data: null },
                },
              },
            },
            '404': { description: 'Game not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
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
      '/gifts/generate': {
        post: {
          tags: ['Gifts'],
          summary: 'Generate a personalised gift page',
          description: 'Starts async AI generation. Returns immediately with a giftId. Poll GET /gifts/{giftId} to check status.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GenerateGiftRequest' },
                example: {
                  recipientName: 'Bob',
                  occasion: 'Birthday',
                  personalMessage: 'Wishing you a wonderful day!',
                  tone: 'warm',
                  themeName: 'Celebration',
                  themeDirection: 'festive and joyful',
                  templateLabel: 'Classic Card',
                  templateBlueprint: 'template-v1',
                  variationLabel: 'Confetti',
                  variationBlueprint: 'variation-confetti',
                  variationDescription: 'Colorful confetti animation on a white background',
                },
              },
            },
          },
          responses: {
            '202': {
              description: 'Generation started',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 202,
                    message: 'Gift generation started',
                    timestamp: '2026-04-27T10:00:00.000Z',
                    data: { giftId: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
                  },
                },
              },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/gifts/mine': {
        get: {
          tags: ['Gifts'],
          summary: 'List gifts created by the authenticated user',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'cursor', in: 'query', required: false, schema: { type: 'string' }, description: 'Pagination cursor' },
          ],
          responses: {
            '200': {
              description: 'Gift list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Gifts retrieved',
                    timestamp: '2026-04-27T10:00:00.000Z',
                    data: { gifts: [], nextCursor: null },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
          },
        },
      },
      '/gifts/{giftId}': {
        get: {
          tags: ['Gifts'],
          summary: 'Get a gift by ID',
          description: 'No auth required — share the giftId with the recipient to let them view the gift.',
          parameters: [{ name: 'giftId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Gift status and HTML content',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessEnvelope' },
                  example: {
                    statusCode: 200,
                    message: 'Gift retrieved',
                    timestamp: '2026-04-27T10:00:00.000Z',
                    data: { status: 'READY', html: '<!DOCTYPE html>...' },
                  },
                },
              },
            },
            '404': { description: 'Gift not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
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
