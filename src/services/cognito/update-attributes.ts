import { AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, USER_POOL_ID } from './_client';

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
