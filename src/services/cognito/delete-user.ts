import { AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, USER_POOL_ID } from './_client';

export const deleteCognitoUser = async (email: string): Promise<void> => {
  await cognitoClient.send(new AdminDeleteUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
  }));
};
