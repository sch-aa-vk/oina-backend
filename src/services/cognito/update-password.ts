import { AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, USER_POOL_ID } from './_client';

export const updateCognitoUserPassword = async (email: string, newPassword: string): Promise<void> => {
  await cognitoClient.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: newPassword,
    Permanent: true,
  }));
};
