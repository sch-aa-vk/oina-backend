import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Errors } from '../../utils/errors';
import { docClient, USERS_TABLE } from './_client';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type AvatarContentType = typeof ALLOWED_CONTENT_TYPES[number];

const PRESIGNED_URL_EXPIRY_SECONDS = 300;

export const generateAvatarUploadUrl = async (
  userId: string,
  contentType: AvatarContentType
): Promise<{ presignedUrl: string; avatarUrl: string }> => {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw Errors.VALIDATION_ERROR({
      contentType: `Must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
    });
  }

  const bucketName = process.env.AVATAR_BUCKET_NAME!;
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const key = `avatars/${userId}`;

  const presignedUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
  );

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET avatarUrl = :key, updatedAt = :now',
    ExpressionAttributeValues: { ':key': key, ':now': now },
  }));

  return { presignedUrl, avatarUrl: key };
};
