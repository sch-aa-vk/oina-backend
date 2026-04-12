import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { GameRecord, GameResponse, GameVisibility } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, USERS_TABLE, MAX_TOTAL_GAMES, MAX_MONTHLY_GAMES } from './_client';

export const toGameResponse = (record: GameRecord): GameResponse => ({
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
