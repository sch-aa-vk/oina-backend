import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const dynamoClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const GAMES_TABLE = process.env.DYNAMODB_GAMES_TABLE!;
export const GAME_VERSIONS_TABLE = process.env.DYNAMODB_GAME_VERSIONS_TABLE!;
export const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE!;
export const GAME_RESULTS_TABLE = process.env.DYNAMODB_GAME_RESULTS_TABLE!;
export const GAME_LIKES_TABLE = process.env.DYNAMODB_GAME_LIKES_TABLE!;
export const GAME_VIEWS_TABLE = process.env.DYNAMODB_GAME_VIEWS_TABLE!;
export const GAME_COVER_BUCKET_NAME = process.env.GAME_COVER_BUCKET_NAME!;

export const MAX_MONTHLY_GAMES = 5;
export const VIEW_COOLDOWN_SECONDS = 600;
