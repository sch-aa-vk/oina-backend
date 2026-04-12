import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const dynamoClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const GAMES_TABLE = process.env.DYNAMODB_GAMES_TABLE!;
export const GAME_VERSIONS_TABLE = process.env.DYNAMODB_GAME_VERSIONS_TABLE!;
export const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE!;

export const MAX_TOTAL_GAMES = 5;
export const MAX_MONTHLY_GAMES = 3;
