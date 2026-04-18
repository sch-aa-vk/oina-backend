import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as getMe } from '../../src/handlers/users/get-me';
import { handler as updateMe } from '../../src/handlers/users/update-me';
import { Errors } from '../../src/utils/errors';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn().mockReturnValue({ get send() { return mockSend; } }) },
  GetCommand: jest.fn(),
  QueryCommand: jest.fn(),
  UpdateCommand: jest.fn(),
}));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  GetObjectCommand: jest.fn(),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.s3.amazonaws.com/avatars/user-1?X-Amz-Signature=abc'),
}));

const mockValidateAccessToken = jest.fn();
jest.mock('@src/services/token', () => ({
  get validateAccessToken() { return mockValidateAccessToken; },
}));

const makeEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
  ({
    body: null,
    headers: { Authorization: 'Bearer valid-token' },
    pathParameters: null,
    queryStringParameters: null,
    requestContext: { requestId: 'test-request-id' } as never,
    ...overrides,
  } as APIGatewayProxyEvent);

const mockUser = {
  userId: 'user-1',
  email: 'alice@example.com',
  username: 'alice',
  displayName: 'Alice',
  bio: 'Hello',
  avatarUrl: 'avatars/user-1',
  isVerified: true,
  totalGames: 2,
  gamesThisMonth: 1,
  currentMonthStart: '2026-04',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
};

beforeEach(() => {
  jest.resetAllMocks();
  mockValidateAccessToken.mockResolvedValue({
    userId: 'user-1',
    email: 'alice@example.com',
    jti: 'jti-1',
    type: 'access',
  });
  process.env.DYNAMODB_USERS_TABLE = 'oina-users-test';
  process.env.AVATAR_BUCKET_NAME = 'oina-avatars-test';
  process.env.AWS_REGION = 'us-east-1';

  const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');
  getSignedUrl.mockResolvedValue('https://presigned.s3.amazonaws.com/avatars/user-1?X-Amz-Signature=abc');
});

// ── GET /users/me ─────────────────────────────────────────────────────────────

describe('GET /users/me', () => {
  it('returns 200 with profile for valid token', async () => {
    mockSend.mockResolvedValueOnce({ Item: mockUser });

    const result = await getMe(makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Profile retrieved');
    expect(body.data.userId).toBe('user-1');
    expect(body.data.email).toBe('alice@example.com');
    expect(body.data.totalGames).toBe(2);
    expect(body.data.avatarUrl).toContain('presigned.s3.amazonaws.com');
  });

  it('returns 401 when token is missing', async () => {
    mockValidateAccessToken.mockRejectedValueOnce({ statusCode: 401, errorCode: 'TOKEN_MISSING', message: 'Authorization token is required', name: 'AppError' });

    const result = await getMe(makeEvent({ headers: {} }));

    expect(result.statusCode).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mockValidateAccessToken.mockRejectedValueOnce(Errors.TOKEN_INVALID());

    const result = await getMe(makeEvent({ headers: { Authorization: 'Bearer bad-token' } }));

    expect(result.statusCode).toBe(401);
  });

  it('returns 404 when user does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await getMe(makeEvent());

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('USER_NOT_FOUND');
  });
});

// ── PATCH /users/me ───────────────────────────────────────────────────────────

describe('PATCH /users/me', () => {
  it('returns 200 and updated profile after valid partial update', async () => {
    const updatedUser = { ...mockUser, displayName: 'New Name', updatedAt: '2026-04-18T10:05:00.000Z' };
    mockSend
      .mockResolvedValueOnce({}) // UpdateCommand
      .mockResolvedValueOnce({ Item: updatedUser }); // GetCommand after update

    const result = await updateMe(makeEvent({ body: JSON.stringify({ displayName: 'New Name' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Profile updated');
    expect(body.data.displayName).toBe('New Name');
  });

  it('updates bio independently', async () => {
    const updatedUser = { ...mockUser, bio: 'Updated bio' };
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: updatedUser });

    const result = await updateMe(makeEvent({ body: JSON.stringify({ bio: 'Updated bio' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.bio).toBe('Updated bio');
  });

  it('updates username when not taken', async () => {
    const updatedUser = { ...mockUser, username: 'alice_new' };
    mockSend
      .mockResolvedValueOnce({ Items: [] }) // QueryCommand - username not taken
      .mockResolvedValueOnce({})            // UpdateCommand
      .mockResolvedValueOnce({ Item: updatedUser }); // GetCommand after update

    const result = await updateMe(makeEvent({ body: JSON.stringify({ username: 'alice_new' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.username).toBe('alice_new');
  });

  it('returns 409 when username is already taken by another user', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ userId: 'other-user', username: 'taken_name' }] });

    const result = await updateMe(makeEvent({ body: JSON.stringify({ username: 'taken_name' }) }));

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('USERNAME_TAKEN');
  });

  it('supports partial payload (only provided fields are updated)', async () => {
    const updatedUser = { ...mockUser, bio: 'new bio' };
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: updatedUser });

    const result = await updateMe(makeEvent({ body: JSON.stringify({ bio: 'new bio' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.displayName).toBe(mockUser.displayName); // unchanged
    expect(body.data.bio).toBe('new bio');
  });

  it('returns 400 VALIDATION_ERROR for displayName that is too long', async () => {
    const result = await updateMe(makeEvent({ body: JSON.stringify({ displayName: 'x'.repeat(101) }) }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('displayName');
  });

  it('returns 400 VALIDATION_ERROR for bio that is too long', async () => {
    const result = await updateMe(makeEvent({ body: JSON.stringify({ bio: 'x'.repeat(501) }) }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('bio');
  });

  it('returns 400 VALIDATION_ERROR for invalid username format', async () => {
    const result = await updateMe(makeEvent({ body: JSON.stringify({ username: 'ab' }) }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('username');
  });

  it('returns 401 when token is missing', async () => {
    mockValidateAccessToken.mockRejectedValueOnce({ statusCode: 401, errorCode: 'TOKEN_MISSING', message: 'Authorization token is required', name: 'AppError' });

    const result = await updateMe(makeEvent({ headers: {}, body: JSON.stringify({ bio: 'test' }) }));

    expect(result.statusCode).toBe(401);
  });

  it('updates updatedAt timestamp', async () => {
    const newTimestamp = '2026-04-18T12:00:00.000Z';
    const updatedUser = { ...mockUser, updatedAt: newTimestamp };
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: updatedUser });

    const result = await updateMe(makeEvent({ body: JSON.stringify({ bio: 'something' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.updatedAt).toBe(newTimestamp);
  });
});
