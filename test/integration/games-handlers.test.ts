/**
 * Handler integration tests for game endpoints.
 * DynamoDB calls are mocked via jest.mock.
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as getGame } from '../../src/handlers/games/get-game';
import { handler as listGames } from '../../src/handlers/games/list-games';
import { handler as deleteGame } from '../../src/handlers/games/delete-game';
import { handler as publishGame } from '../../src/handlers/games/publish-game';
import { handler as previewGame } from '../../src/handlers/games/preview-game';
import { handler as createGame } from '../../src/handlers/games/create-game';

// ── Mock uuid (ESM-only package, not natively supported by ts-jest CommonJS) ──
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

// ── Mock DynamoDB ─────────────────────────────────────────────────────────────

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn().mockReturnValue({ get send() { return mockSend; } }) },
  GetCommand: jest.fn(),
  QueryCommand: jest.fn(),
  TransactWriteCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  DeleteCommand: jest.fn(),
  PutCommand: jest.fn(),
}));

// ── Mock token validation ────────────────────────────────────────────────────

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

const mockGame = {
  gameId: 'game-1',
  userId: 'user-1',
  type: 'choose-me',
  title: 'Test Game',
  visibility: 'draft',
  content: {},
  viewCount: 0,
  playCount: 0,
  likeCount: 0,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  currentVersion: 1,
};

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();
  // Re-setup auth mock after reset
  mockValidateAccessToken.mockResolvedValue({
    userId: 'user-1',
    email: 'alice@example.com',
    jti: 'jti-1',
    type: 'access',
  });
  process.env.DYNAMODB_GAMES_TABLE = 'oina-games-test';
  process.env.DYNAMODB_GAME_VERSIONS_TABLE = 'oina-game-versions-test';
  process.env.DYNAMODB_USERS_TABLE = 'oina-users-test';
  process.env.DYNAMODB_BLACKLIST_TABLE = 'oina-blacklist-test';
  process.env.JWT_SECRET = 'test-secret';
});

// ── GET /games/{gameId} ───────────────────────────────────────────────────────

describe('GET /games/{gameId} handler', () => {
  it('returns 200 for owner', async () => {
    mockSend.mockResolvedValueOnce({ Item: mockGame }); // GetCommand for game

    const result = await getGame(makeEvent({ pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.gameId).toBe('game-1');
  });

  it('returns 403 for non-owner', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...mockGame, userId: 'other-user' } });

    const result = await getGame(makeEvent({ pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('GAME_FORBIDDEN');
  });

  it('returns 404 when game not found', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await getGame(makeEvent({ pathParameters: { gameId: 'nonexistent' } }));

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('GAME_NOT_FOUND');
  });

  it('returns 401 when auth header missing', async () => {
    mockValidateAccessToken.mockRejectedValueOnce(
      Object.assign(new Error('TOKEN_MISSING'), { statusCode: 401, errorCode: 'TOKEN_MISSING', name: 'AppError' })
    );

    const result = await getGame(makeEvent({ headers: {}, pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(401);
  });
});

// ── GET /games (list) ─────────────────────────────────────────────────────────

describe('GET /games handler', () => {
  it('returns 200 with empty list', async () => {
    mockSend.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined });

    const result = await listGames(makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.games).toEqual([]);
    expect(body.data.nextCursor).toBeUndefined();
  });

  it('returns cursor when more pages exist', async () => {
    mockSend.mockResolvedValueOnce({
      Items: [mockGame],
      LastEvaluatedKey: { gameId: 'game-1', userId: 'user-1', createdAt: '2026-04-01' },
    });

    const result = await listGames(makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.nextCursor).toBeDefined();
  });
});

// ── DELETE /games/{gameId} ────────────────────────────────────────────────────

describe('DELETE /games/{gameId} handler', () => {
  it('returns 200 and deletes game', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: mockGame }) // GetCommand
      .mockResolvedValueOnce({}) // DeleteCommand
      .mockResolvedValueOnce({}); // UpdateCommand (decrement)

    const result = await deleteGame(makeEvent({ pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(200);
  });

  it('returns 403 for non-owner', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...mockGame, userId: 'other-user' } });

    const result = await deleteGame(makeEvent({ pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(403);
  });
});

// ── POST /games/{gameId}/publish ──────────────────────────────────────────────

describe('POST /games/{gameId}/publish handler', () => {
  it('publishes draft -> public', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: mockGame }) // GetCommand (initial check)
      .mockResolvedValueOnce({}) // UpdateCommand
      .mockResolvedValueOnce({}) // PutCommand (version)
      .mockResolvedValueOnce({ Item: { ...mockGame, visibility: 'public', currentVersion: 2 } }); // GetCommand (after update)

    const result = await publishGame(
      makeEvent({
        pathParameters: { gameId: 'game-1' },
        body: JSON.stringify({ visibility: 'public' }),
      })
    );

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Game published');
  });

  it('rejects invalid transition draft -> draft', async () => {
    mockSend.mockResolvedValueOnce({ Item: mockGame });

    const result = await publishGame(
      makeEvent({
        pathParameters: { gameId: 'game-1' },
        body: JSON.stringify({ visibility: 'draft' }),
      })
    );

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('INVALID_GAME_PAYLOAD');
  });
});

// ── GET /games/{gameId}/preview ───────────────────────────────────────────────

describe('GET /games/{gameId}/preview handler', () => {
  it('returns 200 for owner with draft game', async () => {
    mockSend.mockResolvedValueOnce({ Item: mockGame });

    const result = await previewGame(makeEvent({ pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(200);
  });

  it('returns 400 for non-draft game', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...mockGame, visibility: 'public' } });

    const result = await previewGame(makeEvent({ pathParameters: { gameId: 'game-1' } }));

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('PREVIEW_ONLY_FOR_DRAFT');
  });
});

// ── DynamoDB transaction conflict ─────────────────────────────────────────────

describe('POST /games - transaction conflict behavior', () => {
  it('returns 409 quota error when transaction is cancelled due to quota', async () => {
    // First call: TransactWriteCommand fails with TransactionCanceledException
    const txError = Object.assign(new Error('TransactionCanceledException'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [
        { Code: 'ConditionalCheckFailed' }, // Users table check failed
        { Code: 'None' },
        { Code: 'None' },
      ],
    });
    mockSend
      .mockRejectedValueOnce(txError) // TransactWrite
      .mockResolvedValueOnce({ // GetCommand for quota check
        Item: { totalGames: 5, gamesThisMonth: 1, currentMonthStart: '2026-04' },
      });

    const result = await createGame(
      makeEvent({
        body: JSON.stringify({
          type: 'choose-me',
          title: 'Test',
          content: {},
        }),
      })
    );

    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('QUOTA_TOTAL_GAMES_EXCEEDED');
  });
});
