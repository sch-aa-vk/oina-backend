import { AppError } from "../../src/utils/errors";

const mockS3Send = jest.fn();
const mockDocSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({ send: mockDocSend }),
  },
  PutCommand: jest.fn().mockImplementation((input: unknown) => input),
  UpdateCommand: jest.fn().mockImplementation((input: unknown) => input),
  GetCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

import { initGift, processGift } from "../../src/services/gifts/generate-gift";
import { getGift } from "../../src/services/gifts/get-gift";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DYNAMODB_GIFTS_TABLE = "oina-gifts-test";
  process.env.GIFTS_BUCKET_NAME = "oina-gifts-bucket-test";
  process.env.GEMINI_API_KEY = "test-api-key";
});

describe("initGift", () => {
  const validPayload = {
    recipientName: "Alice",
    occasion: "Birthday",
    personalMessage: "Happy birthday!",
    tone: "warm",
    themeName: "Floral",
    themeDirection: "Soft romantic",
    templateLabel: "Classic",
    templateBlueprint: "Blueprint text",
    variationLabel: "Pastel",
    variationBlueprint: "Pastel blueprint",
    variationDescription: "Soft pastel tones",
  };

  it("creates DynamoDB record with GENERATING status", async () => {
    mockDocSend.mockResolvedValue({});
    await initGift("user-1", "gift-123", validPayload);
    expect(mockDocSend).toHaveBeenCalledTimes(1);
    const putArg = mockDocSend.mock.calls[0][0] as {
      Item?: Record<string, unknown>;
    };
    expect(putArg.Item?.status).toBe("GENERATING");
    expect(putArg.Item?.giftId).toBe("gift-123");
  });
});

describe("processGift", () => {
  const validPayload = {
    recipientName: "Alice",
    occasion: "Birthday",
    personalMessage: "Happy birthday!",
    tone: "warm",
    themeName: "Floral",
    themeDirection: "Soft romantic",
    templateLabel: "Classic",
    templateBlueprint: "Blueprint text",
    variationLabel: "Pastel",
    variationBlueprint: "Pastel blueprint",
    variationDescription: "Soft pastel tones",
  };

  function setupHappyPath(html = "<html><body>Gift</body></html>") {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: html }] } }],
      }),
    });
    mockS3Send.mockResolvedValue({});
    mockDocSend.mockResolvedValue({});
  }

  it("uploads to S3 with text/html content type", async () => {
    setupHappyPath();
    await processGift("gift-123", validPayload);
    expect(mockS3Send).toHaveBeenCalledTimes(1);
    const s3Arg = mockS3Send.mock.calls[0][0] as { ContentType?: string };
    expect(s3Arg.ContentType).toBe("text/html");
  });

  it("updates DynamoDB status to READY", async () => {
    setupHappyPath();
    await processGift("gift-123", validPayload);
    const updateArg = mockDocSend.mock.calls[0][0] as {
      ExpressionAttributeValues?: Record<string, unknown>;
    };
    expect(updateArg.ExpressionAttributeValues?.[":ready"]).toBe("READY");
  });

  it("strips markdown fences from Gemini response", async () => {
    setupHappyPath("```html\n<html><body>Gift</body></html>\n```");
    await expect(processGift("gift-123", validPayload)).resolves.not.toThrow();
  });

  it("throws GEMINI_API_ERROR when Gemini returns non-ok response", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "quota exceeded",
    });

    await expect(processGift("gift-123", validPayload)).rejects.toMatchObject({
      errorCode: "GEMINI_API_ERROR",
      statusCode: 502,
    });
  });

  it("throws GEMINI_API_ERROR when response has no candidates", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });

    await expect(processGift("gift-123", validPayload)).rejects.toMatchObject({
      errorCode: "GEMINI_API_ERROR",
    });
  });

  it("throws GEMINI_API_ERROR as AppError instance", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });

    await expect(processGift("gift-123", validPayload)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe("getGift", () => {
  it("returns html when gift is READY", async () => {
    mockDocSend.mockResolvedValue({
      Item: {
        giftId: "abc-123",
        userId: "user-1",
        recipientName: "Alice",
        occasion: "Birthday",
        s3Key: "gifts/abc-123.html",
        createdAt: new Date().toISOString(),
        status: "READY",
      },
    });
    mockS3Send.mockResolvedValue({
      Body: {
        transformToString: async () => "<html><body>Hello</body></html>",
      },
    });

    const result = await getGift("abc-123");
    expect(result.status).toBe("READY");
    expect(result.html).toBe("<html><body>Hello</body></html>");
  });

  it("returns GENERATING status without fetching S3", async () => {
    mockDocSend.mockResolvedValue({
      Item: {
        giftId: "abc-123",
        userId: "user-1",
        s3Key: "",
        createdAt: new Date().toISOString(),
        status: "GENERATING",
      },
    });

    const result = await getGift("abc-123");
    expect(result.status).toBe("GENERATING");
    expect(result.html).toBeUndefined();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it("returns ERROR status without fetching S3", async () => {
    mockDocSend.mockResolvedValue({
      Item: {
        giftId: "abc-123",
        userId: "user-1",
        s3Key: "",
        createdAt: new Date().toISOString(),
        status: "ERROR",
        errorMessage: "Gemini quota exceeded",
      },
    });

    const result = await getGift("abc-123");
    expect(result.status).toBe("ERROR");
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it("throws GIFT_NOT_FOUND when DynamoDB returns no item", async () => {
    mockDocSend.mockResolvedValue({ Item: undefined });

    await expect(getGift("missing-id")).rejects.toMatchObject({
      errorCode: "GIFT_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("throws GIFT_NOT_FOUND as AppError instance", async () => {
    mockDocSend.mockResolvedValue({ Item: null });

    await expect(getGift("missing-id")).rejects.toBeInstanceOf(AppError);
  });
});
