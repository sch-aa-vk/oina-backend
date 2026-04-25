import { AppError } from '../../src/utils/errors';

// ── Module mocks (must be before any imports that depend on them) ─────────────

const mockSsmSend = jest.fn();
const mockS3Send = jest.fn();
const mockDocSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({ send: mockDocSend }),
  },
  PutCommand: jest.fn().mockImplementation((input: unknown) => input),
  GetCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

// ── Static imports (after mocks are set up) ───────────────────────────────────

import { generateGift } from '../../src/services/gifts/generate-gift';
import { getGift } from '../../src/services/gifts/get-gift';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DYNAMODB_GIFTS_TABLE = 'oina-gifts-test';
  process.env.GIFTS_BUCKET_NAME = 'oina-gifts-bucket-test';
  process.env.GEMINI_API_KEY_PARAM = '/oina/test/gemini-api-key';
});

// ── generateGift ──────────────────────────────────────────────────────────────

describe('generateGift', () => {
  const validPayload = {
    recipientName: 'Alice',
    occasion: 'Birthday',
    personalMessage: 'Happy birthday!',
    tone: 'warm',
    themeName: 'Floral',
    themeDirection: 'Soft romantic',
    templateLabel: 'Classic',
    templateBlueprint: 'Blueprint text',
    variationLabel: 'Pastel',
    variationBlueprint: 'Pastel blueprint',
    variationDescription: 'Soft pastel tones',
  };

  function setupHappyPath(html = '<html><body>Gift</body></html>') {
    mockSsmSend.mockResolvedValue({ Parameter: { Value: 'test-api-key' } });
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: html }] } }],
      }),
    });
    mockS3Send.mockResolvedValue({});
    mockDocSend.mockResolvedValue({});
  }

  it('returns giftId on success', async () => {
    setupHappyPath();
    const result = await generateGift('user-1', validPayload);
    expect(result).toHaveProperty('giftId');
    expect(typeof result.giftId).toBe('string');
  });

  it('calls S3 PutObject with text/html content type', async () => {
    setupHappyPath();
    await generateGift('user-1', validPayload);
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const s3Arg = mockS3Send.mock.calls[0][0] as { ContentType?: string };
    expect(s3Arg.ContentType).toBe('text/html');
  });

  it('strips markdown fences from Gemini response', async () => {
    setupHappyPath('```html\n<html><body>Gift</body></html>\n```');
    const result = await generateGift('user-1', validPayload);
    expect(result.giftId).toBeTruthy();
  });

  it('throws GEMINI_API_ERROR when Gemini returns non-ok response', async () => {
    mockSsmSend.mockResolvedValue({ Parameter: { Value: 'test-api-key' } });
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'quota exceeded',
    });

    await expect(generateGift('user-1', validPayload)).rejects.toMatchObject({
      errorCode: 'GEMINI_API_ERROR',
      statusCode: 502,
    });
  });

  it('throws GEMINI_API_ERROR when response has no candidates', async () => {
    mockSsmSend.mockResolvedValue({ Parameter: { Value: 'test-api-key' } });
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });

    await expect(generateGift('user-1', validPayload)).rejects.toMatchObject({
      errorCode: 'GEMINI_API_ERROR',
    });
  });

  it('throws GEMINI_API_ERROR with correct AppError instance', async () => {
    mockSsmSend.mockResolvedValue({ Parameter: { Value: 'test-api-key' } });
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });

    await expect(generateGift('user-1', validPayload)).rejects.toBeInstanceOf(AppError);
  });
});

// ── getGift ───────────────────────────────────────────────────────────────────

describe('getGift', () => {
  it('returns html when gift exists', async () => {
    mockDocSend.mockResolvedValue({
      Item: {
        giftId: 'abc-123',
        userId: 'user-1',
        recipientName: 'Alice',
        occasion: 'Birthday',
        s3Key: 'gifts/abc-123.html',
        createdAt: new Date().toISOString(),
      },
    });
    mockS3Send.mockResolvedValue({
      Body: { transformToString: async () => '<html><body>Hello</body></html>' },
    });

    const result = await getGift('abc-123');
    expect(result.html).toBe('<html><body>Hello</body></html>');
  });

  it('throws GIFT_NOT_FOUND when DynamoDB returns no item', async () => {
    mockDocSend.mockResolvedValue({ Item: undefined });

    await expect(getGift('missing-id')).rejects.toMatchObject({
      errorCode: 'GIFT_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('throws GIFT_NOT_FOUND with correct AppError instance', async () => {
    mockDocSend.mockResolvedValue({ Item: null });

    await expect(getGift('missing-id')).rejects.toBeInstanceOf(AppError);
  });
});
