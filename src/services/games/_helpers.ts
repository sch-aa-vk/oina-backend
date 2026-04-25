import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { GameRecord, GameResponse, GameSummaryResponse, GameVisibility } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, USERS_TABLE, MAX_MONTHLY_GAMES, GAME_COVER_BUCKET_NAME } from './_client';

const COVER_URL_EXPIRY_SECONDS = 3600;

const resolveCoverUrl = async (key: string): Promise<string> => {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: GAME_COVER_BUCKET_NAME, Key: key }),
    { expiresIn: COVER_URL_EXPIRY_SECONDS }
  );
};

const isCoverKey = (value: string): boolean => value.startsWith('game-covers/');

export const toGameResponse = async (record: GameRecord): Promise<GameResponse> => ({
  gameId: record.gameId,
  userId: record.userId,
  type: record.type,
  title: record.title,
  description: record.description,
  thumbnail: record.thumbnail && isCoverKey(record.thumbnail)
    ? await resolveCoverUrl(record.thumbnail)
    : record.thumbnail,
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
  isDeleted: record.isDeleted,
  deletedAt: record.deletedAt,
});

export const toGameSummaryResponse = async (record: GameRecord): Promise<GameSummaryResponse> => ({
  gameId: record.gameId,
  userId: record.userId,
  type: record.type,
  title: record.title,
  description: record.description,
  thumbnail: record.thumbnail && isCoverKey(record.thumbnail)
    ? await resolveCoverUrl(record.thumbnail)
    : record.thumbnail,
  category: record.category,
  tags: record.tags,
  visibility: record.visibility,
  publishedAt: record.publishedAt,
  shareLink: record.shareLink,
  viewCount: record.viewCount,
  playCount: record.playCount,
  likeCount: record.likeCount,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  isDeleted: record.isDeleted,
});

export const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const getGameOrThrow = async (gameId: string): Promise<GameRecord> => {
  const result = await docClient.send(
    new GetCommand({ TableName: GAMES_TABLE, Key: { gameId } })
  );
  if (!result.Item) throw Errors.GAME_NOT_FOUND();
  return result.Item as GameRecord;
};

export const assertOwner = (game: GameRecord, userId: string): void => {
  if (game.userId !== userId) throw Errors.GAME_FORBIDDEN();
};

export const ALLOWED_TRANSITIONS: Record<GameVisibility, GameVisibility[]> = {
  draft: ['private-link', 'public'],
  'private-link': ['public', 'draft'],
  public: ['private-link', 'draft'],
};

export const assertValidTransition = (from: GameVisibility, to: GameVisibility): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw Errors.INVALID_VISIBILITY_TRANSITION(from, to);
  }
};

export const isTransactionCancelledError = (err: unknown): boolean => {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'TransactionCanceledException'
  );
};

export const getUserForQuotaCheck = async (
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

export const throwQuotaError = (
  gamesThisMonth: number,
  currentMonthStart: string,
  currentMonth: string
): never => {
  const effectiveMonthly = currentMonthStart !== currentMonth ? 0 : gamesThisMonth;
  if (effectiveMonthly >= MAX_MONTHLY_GAMES) throw Errors.QUOTA_MONTHLY_GAMES_EXCEEDED();
  throw Errors.INTERNAL_ERROR();
};
