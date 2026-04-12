import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, USER_POOL_ID } from './_client';

export const createCognitoUser = async (userId: string, email: string, password: string): Promise<void> => {
  await cognitoClient.send(new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'custom:userId', Value: userId },
      { Name: 'email_verified', Value: 'true' },
    ],
    MessageAction: 'SUPPRESS',
    TemporaryPassword: password,
  }));

  await cognitoClient.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: password,
    Permanent: true,
  }));
};
