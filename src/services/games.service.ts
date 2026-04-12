import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateGamePayload,
  UpdateGamePayload,
  PublishGamePayload,
  GameRecord,
  GameVersionRecord,
  GameResponse,
  GameListResponse,
  VersionResponse,
  GameVisibility,
} from '../types/game.types';
import { Errors } from '../utils/errors';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const GAMES_TABLE = process.env.DYNAMODB_GAMES_TABLE!;
const GAME_VERSIONS_TABLE = process.env.DYNAMODB_GAME_VERSIONS_TABLE!;
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE!;

const MAX_TOTAL_GAMES = 5;
const MAX_MONTHLY_GAMES = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toGameResponse = (record: GameRecord): GameResponse => ({
  gameId: record.gameId,
  userId: record.userId,
  type: record.type,
  title: record.title,
  description: record.description,
  thumbnail: record.thumbnail,
  category: record.category,
  tags: record.tags,
  visibility: record.visibility,
  content: record.content,
  publishedAt: record.publishedAt,
  shareLink: record.shareLink,
  viewCount: record.viewCount,
  playCount: record.playCount,
  likeCount: record.likeCount,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  currentVersion: record.currentVersion,
});

const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getGameOrThrow = async (gameId: string): Promise<GameRecord> => {
  const result = await docClient.send(
    new GetCommand({ TableName: GAMES_TABLE, Key: { gameId } })
  );
  if (!result.Item) throw Errors.GAME_NOT_FOUND();
  return result.Item as GameRecord;
};

const assertOwner = (game: GameRecord, userId: string): void => {
  if (game.userId !== userId) throw Errors.GAME_FORBIDDEN();
};

// ─── Allowed visibility transitions ──────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<GameVisibility, GameVisibility[]> = {
  draft: ['private-link', 'public'],
  'private-link': ['public', 'draft'],
  public: ['private-link', 'draft'],
};

const assertValidTransition = (from: GameVisibility, to: GameVisibility): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw Errors.INVALID_VISIBILITY_TRANSITION(from, to);
  }
};

// ─── Service Methods ──────────────────────────────────────────────────────────

export const createGame = async (userId: string, payload: CreateGamePayload): Promise<GameResponse> => {
  const now = new Date().toISOString();
  const currentMonth = getCurrentMonthKey();
  const gameId = uuidv4();
  const versionId = uuidv4();

  const gameRecord: GameRecord = {
    gameId,
    userId,
    type: payload.type,
    title: payload.title.trim(),
    description: payload.description,
    category: payload.category,
    tags: payload.tags ?? [],
    visibility: 'draft',
    content: payload.content,
    viewCount: 0,
    playCount: 0,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
    currentVersion: 1,
  };

  const versionRecord: GameVersionRecord = {
    versionId,
    gameId,
    userId,
    versionNumber: 1,
    changeLog: 'Initial version',
    visibility: 'draft',
    createdAt: now,
  };

  // Atomic transaction: update user counters + insert game + insert version
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // Conditionally update user counters (handles month rollover + quota checks)
            Update: {
              TableName: USERS_TABLE,
              Key: { userId },
              ConditionExpression:
                '(attribute_not_exists(totalGames) OR totalGames < :maxTotal) AND ' +
                '(#csm = :currentMonth AND (attribute_not_exists(gamesThisMonth) OR gamesThisMonth < :maxMonthly)) OR ' +
                '(#csm <> :currentMonth)',
              UpdateExpression:
                'SET ' +
                'totalGames = if_not_exists(totalGames, :zero) + :one, ' +
                'gamesThisMonth = if_not_exists(gamesThisMonth, :zero) + :one, ' +
                '#csm = :currentMonth',
              ExpressionAttributeNames: { '#csm': 'currentMonthStart' },
              ExpressionAttributeValues: {
                ':zero': 0,
                ':one': 1,
                ':maxTotal': MAX_TOTAL_GAMES,
                ':maxMonthly': MAX_MONTHLY_GAMES,
                ':currentMonth': currentMonth,
              },
            },
          },
          {
            Put: {
              TableName: GAMES_TABLE,
              Item: gameRecord,
              ConditionExpression: 'attribute_not_exists(gameId)',
            },
          },
          {
            Put: {
              TableName: GAME_VERSIONS_TABLE,
              Item: versionRecord,
              ConditionExpression: 'attribute_not_exists(versionId)',
            },
          },
        ],
      })
    );
  } catch (err: unknown) {
    if (isTransactionCancelledError(err)) {
      const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
      const userReason = reasons[0];
      if (userReason?.Code === 'ConditionalCheckFailed') {
        // Need to check which quota was exceeded
        const user = await getUserForQuotaCheck(userId, currentMonth);
        throwQuotaError(user.totalGames, user.gamesThisMonth, user.currentMonthStart, currentMonth);
      }
    }
    throw err;
  }

  return toGameResponse(gameRecord);
};

const getUserForQuotaCheck = async (
  userId: string,
  currentMonth: string
): Promise<{ totalGames: number; gamesThisMonth: number; currentMonthStart: string }> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      ProjectionExpression: 'totalGames, gamesThisMonth, currentMonthStart',
    })
  );
  const item = result.Item ?? {};
  return {
    totalGames: (item.totalGames as number) ?? 0,
    gamesThisMonth: (item.gamesThisMonth as number) ?? 0,
    currentMonthStart: (item.currentMonthStart as string) ?? currentMonth,
  };
};

const throwQuotaError = (
  totalGames: number,
  gamesThisMonth: number,
  currentMonthStart: string,
  currentMonth: string
): never => {
  if (totalGames >= MAX_TOTAL_GAMES) throw Errors.QUOTA_TOTAL_GAMES_EXCEEDED();
  const effectiveMonthly = currentMonthStart !== currentMonth ? 0 : gamesThisMonth;
  if (effectiveMonthly >= MAX_MONTHLY_GAMES) throw Errors.QUOTA_MONTHLY_GAMES_EXCEEDED();
  throw Errors.QUOTA_TOTAL_GAMES_EXCEEDED(); // fallback
};

const isTransactionCancelledError = (err: unknown): boolean => {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'TransactionCanceledException'
  );
};

export const listUserGames = async (userId: string, cursor?: string): Promise<GameListResponse> => {
  const exclusiveStartKey = cursor
    ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Record<string, unknown>)
    : undefined;

  const result = await docClient.send(
    new QueryCommand({
      TableName: GAMES_TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
      Limit: 20,
      ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
    })
  );

  const games = (result.Items ?? []).map((item) => toGameResponse(item as GameRecord));
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return { games, nextCursor };
};

export const getUserGame = async (userId: string, gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  return toGameResponse(game);
};

export const updateGame = async (
  userId: string,
  gameId: string,
  payload: UpdateGamePayload
): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  const now = new Date().toISOString();
  const newVersion = game.currentVersion + 1;

  const updateExpressionParts: string[] = [
    'updatedAt = :now',
    'currentVersion = :newVersion',
  ];
  const expressionAttributeValues: Record<string, unknown> = {
    ':now': now,
    ':newVersion': newVersion,
    ':userId': userId,
  };
  const expressionAttributeNames: Record<string, string> = {};

  if (payload.title !== undefined) {
    updateExpressionParts.push('#title = :title');
    expressionAttributeValues[':title'] = payload.title.trim();
    expressionAttributeNames['#title'] = 'title';
  }
  if (payload.description !== undefined) {
    updateExpressionParts.push('description = :description');
    expressionAttributeValues[':description'] = payload.description;
  }
  if (payload.category !== undefined) {
    updateExpressionParts.push('category = :category');
    expressionAttributeValues[':category'] = payload.category;
  }
  if (payload.tags !== undefined) {
    updateExpressionParts.push('tags = :tags');
    expressionAttributeValues[':tags'] = payload.tags;
  }
  if (payload.content !== undefined) {
    updateExpressionParts.push('content = :content');
    expressionAttributeValues[':content'] = payload.content;
  }

  const versionRecord: GameVersionRecord = {
    versionId: uuidv4(),
    gameId,
    userId,
    versionNumber: newVersion,
    changeLog: payload.changeLog ?? 'Game updated',
    visibility: game.visibility,
    createdAt: now,
  };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0
          ? { ExpressionAttributeNames: expressionAttributeNames }
          : {}),
        ReturnValues: 'ALL_NEW',
      })
    ),
    docClient.send(
      new PutCommand({ TableName: GAME_VERSIONS_TABLE, Item: versionRecord })
    ),
  ]);

  const updated = await getGameOrThrow(gameId);
  return toGameResponse(updated);
};

export const deleteGame = async (userId: string, gameId: string): Promise<void> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  await docClient.send(
    new DeleteCommand({
      TableName: GAMES_TABLE,
      Key: { gameId },
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    })
  );

  // Decrement user counter
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET totalGames = totalGames - :one',
      ConditionExpression: 'totalGames > :zero',
      ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
    })
  ).catch(() => {
    // If counter is already 0, swallow the error (best-effort decrement)
  });
};

export const publishGame = async (
  userId: string,
  gameId: string,
  payload: PublishGamePayload
): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  assertValidTransition(game.visibility, payload.visibility);

  const now = new Date().toISOString();
  const newVersion = game.currentVersion + 1;
  const shareLink = game.shareLink ?? uuidv4();
  const publishedAt = game.publishedAt ?? now;

  const updateExpressionParts = [
    'visibility = :visibility',
    'shareLink = :shareLink',
    'publishedAt = :publishedAt',
    'updatedAt = :now',
    'currentVersion = :newVersion',
  ];
  const expressionAttributeValues: Record<string, unknown> = {
    ':visibility': payload.visibility,
    ':shareLink': shareLink,
    ':publishedAt': publishedAt,
    ':now': now,
    ':newVersion': newVersion,
    ':userId': userId,
  };

  const versionRecord: GameVersionRecord = {
    versionId: uuidv4(),
    gameId,
    userId,
    versionNumber: newVersion,
    changeLog: payload.changeLog ?? `Published as ${payload.visibility}`,
    visibility: payload.visibility,
    createdAt: now,
  };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: expressionAttributeValues,
      })
    ),
    docClient.send(
      new PutCommand({ TableName: GAME_VERSIONS_TABLE, Item: versionRecord })
    ),
  ]);

  const updated = await getGameOrThrow(gameId);
  return toGameResponse(updated);
};

export const unpublishGame = async (userId: string, gameId: string, changeLog?: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  assertValidTransition(game.visibility, 'draft');

  const now = new Date().toISOString();
  const newVersion = game.currentVersion + 1;

  const versionRecord: GameVersionRecord = {
    versionId: uuidv4(),
    gameId,
    userId,
    versionNumber: newVersion,
    changeLog: changeLog ?? 'Game unpublished',
    visibility: 'draft',
    createdAt: now,
  };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: 'SET visibility = :draft, updatedAt = :now, currentVersion = :newVersion',
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':draft': 'draft',
          ':now': now,
          ':newVersion': newVersion,
          ':userId': userId,
        },
      })
    ),
    docClient.send(
      new PutCommand({ TableName: GAME_VERSIONS_TABLE, Item: versionRecord })
    ),
  ]);

  const updated = await getGameOrThrow(gameId);
  return toGameResponse(updated);
};

export const previewGame = async (userId: string, gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  if (game.visibility !== 'draft') throw Errors.PREVIEW_ONLY_FOR_DRAFT();
  return toGameResponse(game);
};

export const listGameVersions = async (userId: string, gameId: string): Promise<VersionResponse[]> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: GAME_VERSIONS_TABLE,
      IndexName: 'gameId-createdAt-index',
      KeyConditionExpression: 'gameId = :gameId',
      ExpressionAttributeValues: { ':gameId': gameId },
      ScanIndexForward: false,
    })
  );

  return (result.Items ?? []).map((item) => {
    const v = item as GameVersionRecord;
    return {
      versionId: v.versionId,
      gameId: v.gameId,
      versionNumber: v.versionNumber,
      changeLog: v.changeLog,
      visibility: v.visibility,
      createdAt: v.createdAt,
    };
  });
};
