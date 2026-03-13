import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

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

export const updateCognitoUserPassword = async (email: string, newPassword: string): Promise<void> => {
  await cognitoClient.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: newPassword,
    Permanent: true,
  }));
};

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

export const deleteCognitoUser = async (email: string): Promise<void> => {
  await cognitoClient.send(new AdminDeleteUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
  }));
};

export const updateCognitoUserAttributes = async (
  email: string,
  attributes: { Name: string; Value: string }[]
): Promise<void> => {
  await cognitoClient.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: attributes,
  }));
};
