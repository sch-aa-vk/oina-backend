import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export const cognitoClient = new CognitoIdentityProviderClient({});
export const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
