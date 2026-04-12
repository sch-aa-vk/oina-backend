import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const dynamoClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE!;
export const OTP_TABLE = process.env.DYNAMODB_OTP_TABLE!;
export const BCRYPT_ROUNDS = 10;
