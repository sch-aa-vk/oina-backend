import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateGamePayload, GameVersionRecord, GameResponse } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { docClient, GAMES_TABLE, GAME_VERSIONS_TABLE, GAME_COVER_BUCKET_NAME } from './_client';
import { getGameOrThrow, assertOwner, toGameResponse } from './_helpers';

const ALLOWED_COVER_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const COVER_UPLOAD_URL_EXPIRY_SECONDS = 300;

export const updateGame = async (
  userId: string,
  gameId: string,
  payload: UpdateGamePayload
): Promise<GameResponse> => {
  if (payload.coverImageContentType && !ALLOWED_COVER_CONTENT_TYPES.includes(payload.coverImageContentType as typeof ALLOWED_COVER_CONTENT_TYPES[number])) {
    throw Errors.VALIDATION_ERROR({
      coverImageContentType: `Must be one of: ${ALLOWED_COVER_CONTENT_TYPES.join(', ')}`,
    });
  }

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
    updateExpressionParts.push('#title = :title, titleLower = :titleLower');
    expressionAttributeValues[':title'] = payload.title.trim();
    expressionAttributeValues[':titleLower'] = payload.title.trim().toLowerCase();
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
  if (payload.coverImageContentType !== undefined) {
    updateExpressionParts.push('thumbnail = :thumbnail');
    expressionAttributeValues[':thumbnail'] = `game-covers/${gameId}`;
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
  const response = await toGameResponse(updated);

  let coverUploadUrl: string | undefined;
  if (payload.coverImageContentType) {
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    coverUploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: GAME_COVER_BUCKET_NAME,
        Key: `game-covers/${gameId}`,
        ContentType: payload.coverImageContentType,
      }),
      { expiresIn: COVER_UPLOAD_URL_EXPIRY_SECONDS }
    );
  }

  return { ...response, coverUploadUrl };
};
