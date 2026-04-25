import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UserRecord, UpdateProfilePayload } from '../../types/user.types';
import { Errors } from '../../utils/errors';
import { docClient, USERS_TABLE } from './_client';
import { getCurrentUserProfile } from './get-profile';

export const updateCurrentUserProfile = async (
  userId: string,
  patch: UpdateProfilePayload
): Promise<UserRecord> => {
  const now = new Date().toISOString();

  if (patch.username !== undefined) {
    const existing = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': patch.username },
      Limit: 1,
    }));
    const taken = existing.Items?.[0] as UserRecord | undefined;
    if (taken && taken.userId !== userId) {
      throw Errors.USERNAME_TAKEN();
    }
  }

  const updateParts: string[] = ['updatedAt = :now'];
  const attrValues: Record<string, unknown> = { ':now': now };
  const attrNames: Record<string, string> = {};

  if (patch.displayName !== undefined) {
    updateParts.push('displayName = :displayName');
    attrValues[':displayName'] = patch.displayName.trim();
  }
  if (patch.bio !== undefined) {
    updateParts.push('bio = :bio');
    attrValues[':bio'] = patch.bio;
  }
  if (patch.username !== undefined) {
    updateParts.push('#username = :username');
    attrValues[':username'] = patch.username;
    attrNames['#username'] = 'username';
  }

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeValues: attrValues,
    ...(Object.keys(attrNames).length > 0 ? { ExpressionAttributeNames: attrNames } : {}),
  }));

  return getCurrentUserProfile(userId);
};
