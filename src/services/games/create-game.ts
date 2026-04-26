import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CreateGamePayload, GameRecord, GameVersionRecord, GameResponse } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, GAME_VERSIONS_TABLE, USERS_TABLE, MAX_MONTHLY_GAMES, GAME_COVER_BUCKET_NAME } from './_client';
import {
  toGameResponse,
  getCurrentMonthKey,
  isTransactionCancelledError,
  getUserForQuotaCheck,
  throwQuotaError,
} from './_helpers';

const ALLOWED_COVER_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const COVER_UPLOAD_URL_EXPIRY_SECONDS = 300;

export const createGame = async (userId: string, payload: CreateGamePayload): Promise<GameResponse> => {
  if (payload.coverImageContentType && !ALLOWED_COVER_CONTENT_TYPES.includes(payload.coverImageContentType as typeof ALLOWED_COVER_CONTENT_TYPES[number])) {
    throw Errors.VALIDATION_ERROR({
      coverImageContentType: `Must be one of: ${ALLOWED_COVER_CONTENT_TYPES.join(', ')}`,
    });
  }

  const now = new Date().toISOString();
  const currentMonth = getCurrentMonthKey();
  const gameId = uuidv4();
  const versionId = uuidv4();
  const coverKey = payload.coverImageContentType ? `game-covers/${gameId}` : undefined;

  const gameRecord: GameRecord = {
    gameId,
    userId,
    type: payload.type,
    title: payload.title.trim(),
    titleLower: payload.title.trim().toLowerCase(),
    description: payload.description,
    thumbnail: coverKey,
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

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: USERS_TABLE,
              Key: { userId },
              ConditionExpression:
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
        const user = await getUserForQuotaCheck(userId, currentMonth);
        throwQuotaError(user.gamesThisMonth, user.currentMonthStart, currentMonth);
      }
    }
    throw err;
  }

  let coverUploadUrl: string | undefined;
  if (coverKey && payload.coverImageContentType) {
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    coverUploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: GAME_COVER_BUCKET_NAME, Key: coverKey, ContentType: payload.coverImageContentType }),
      { expiresIn: COVER_UPLOAD_URL_EXPIRY_SECONDS }
    );
  }

  const response = await toGameResponse(gameRecord);
  return { ...response, coverUploadUrl };
};
