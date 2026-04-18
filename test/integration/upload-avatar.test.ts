import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as uploadAvatar } from '../../src/handlers/users/upload-avatar';
import { Errors } from '../../src/utils/errors';

// ── Mock DynamoDB ─────────────────────────────────────────────────────────────

const mockDynamoSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn().mockReturnValue({ get send() { return mockDynamoSend; } }) },
  UpdateCommand: jest.fn(),
}));

// ── Mock S3 + presigner ───────────────────────────────────────────────────────

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn(),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.s3.amazonaws.com/avatars/user-1?X-Amz-Signature=abc'),
}));

// ── Mock token validation ─────────────────────────────────────────────────────

const mockValidateAccessToken = jest.fn();
jest.mock('@src/services/token', () => ({
  get validateAccessToken() { return mockValidateAccessToken; },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    body: null,
    headers: { Authorization: 'Bearer valid-token' },
    pathParameters: null,
    queryStringParameters: null,
    requestContext: { requestId: 'test-request-id' } as never,
    ...overrides,
  } as APIGatewayProxyEvent);

beforeEach(() => {
  jest.resetAllMocks();
  mockValidateAccessToken.mockResolvedValue({
    userId: 'user-1',
    email: 'alice@example.com',
    jti: 'jti-1',
    type: 'access',
  });
  mockDynamoSend.mockResolvedValue({});
  process.env.DYNAMODB_USERS_TABLE = 'oina-users-test';
  process.env.AVATAR_BUCKET_NAME = 'oina-avatars-test';
  process.env.AWS_REGION = 'us-east-1';

  const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');
  getSignedUrl.mockResolvedValue('https://presigned.s3.amazonaws.com/avatars/user-1?X-Amz-Signature=abc');
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /users/me/avatar', () => {
  it('returns 200 with presignedUrl and avatarUrl for valid jpeg contentType', async () => {
    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/jpeg' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Avatar upload URL generated');
    expect(body.data.presignedUrl).toContain('presigned.s3.amazonaws.com');
    expect(body.data.avatarUrl).toBe('https://oina-avatars-test.s3.amazonaws.com/avatars/user-1');
  });

  it('returns 200 for image/png contentType', async () => {
    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/png' }) }));
    expect(result.statusCode).toBe(200);
  });

  it('returns 200 for image/webp contentType', async () => {
    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/webp' }) }));
    expect(result.statusCode).toBe(200);
  });

  it('returns 200 for image/gif contentType', async () => {
    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/gif' }) }));
    expect(result.statusCode).toBe(200);
  });

  it('returns 400 VALIDATION_ERROR for unsupported contentType', async () => {
    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/bmp' }) }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('contentType');
  });

  it('returns 400 VALIDATION_ERROR when contentType is missing', async () => {
    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({}) }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('updates avatarUrl on user record in DynamoDB', async () => {
    await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/jpeg' }) }));

    expect(mockDynamoSend).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when token is missing', async () => {
    const result = await uploadAvatar(makeEvent({ headers: {}, body: JSON.stringify({ contentType: 'image/jpeg' }) }));
    expect(result.statusCode).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mockValidateAccessToken.mockRejectedValueOnce(Errors.TOKEN_INVALID());

    const result = await uploadAvatar(makeEvent({ body: JSON.stringify({ contentType: 'image/jpeg' }) }));
    expect(result.statusCode).toBe(401);
  });
});
