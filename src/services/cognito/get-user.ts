import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, USER_POOL_ID } from './_client';

export const getCognitoUser = async (email: string) => {
  try {
    const result = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }));
    return result;
  } catch (err: any) {
    if (err.name === 'UserNotFoundException') return null;
    throw err;
  }
};
