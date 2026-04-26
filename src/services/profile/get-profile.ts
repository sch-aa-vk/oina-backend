import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { UserRecord } from '../../types/user.types';
import { Errors } from '../../utils/errors';
import { docClient, USERS_TABLE } from './_client';

const AVATAR_URL_EXPIRY_SECONDS = 3600;

const resolveAvatarUrl = async (avatarKey: string): Promise<string> => {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.AVATAR_BUCKET_NAME!,
      Key: avatarKey,
    }),
    { expiresIn: AVATAR_URL_EXPIRY_SECONDS }
  );
};

const isS3Key = (value: string): boolean => value.startsWith('avatars/');

export const getCurrentUserProfile = async (userId: string): Promise<UserRecord> => {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));

  if (!result.Item) {
    throw Errors.USER_NOT_FOUND();
  }

  const user = result.Item as UserRecord;

  if (user.avatarUrl && isS3Key(user.avatarUrl)) {
    user.avatarUrl = await resolveAvatarUrl(user.avatarUrl);
  }

  const { passwordHash: _, userId: __, ...safeUser } = user;
  return safeUser as UserRecord;
};
