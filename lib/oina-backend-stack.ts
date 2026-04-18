import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { loadEnvironment } from './config/environment';
import { ApiConstruct } from './constructs/api.construct';
import { AuthLambdasConstruct } from './constructs/auth-lambdas.construct';
import { CognitoConstruct } from './constructs/cognito.construct';
import { DynamoDbConstruct } from './constructs/dynamodb.construct';
import { GameLambdasConstruct } from './constructs/game-lambdas.construct';
import { IamConstruct } from './constructs/iam.construct';
import { S3Construct } from './constructs/s3.construct';

export class OinaBackendStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const env = loadEnvironment();
		const { stageName } = env;

		const cognitoConstruct = new CognitoConstruct(this, 'Cognito', { stageName });

		const dynamoDbConstruct = new DynamoDbConstruct(this, 'DynamoDb', { stageName });

		const s3Construct = new S3Construct(this, 'S3', { stageName });

		const iamConstruct = new IamConstruct(this, 'Iam', {
			stageName,
			usersTable: dynamoDbConstruct.usersTable,
			otpCodesTable: dynamoDbConstruct.otpCodesTable,
			tokenBlacklistTable: dynamoDbConstruct.tokenBlacklistTable,
			gamesTable: dynamoDbConstruct.gamesTable,
			gameVersionsTable: dynamoDbConstruct.gameVersionsTable,
			userPool: cognitoConstruct.userPool,
			avatarBucket: s3Construct.avatarBucket,
		});

		const sharedEnv: Record<string, string> = {
			STAGE_NAME: stageName,
			DYNAMODB_USERS_TABLE: dynamoDbConstruct.usersTable.tableName,
			AVATAR_BUCKET_NAME: s3Construct.avatarBucket.bucketName,
			DYNAMODB_OTP_TABLE: dynamoDbConstruct.otpCodesTable.tableName,
			DYNAMODB_BLACKLIST_TABLE: dynamoDbConstruct.tokenBlacklistTable.tableName,
			COGNITO_USER_POOL_ID: cognitoConstruct.userPool.userPoolId,
			COGNITO_CLIENT_ID: cognitoConstruct.userPoolClient.userPoolClientId,
			JWT_SECRET: env.jwtSecret,
			SMTP_HOST: env.smtpHost,
			SMTP_PORT: env.smtpPort,
			SMTP_USER: env.smtpUser,
			SMTP_PASSWORD: env.smtpPassword,
			SMTP_FROM: env.smtpFrom,
		};

		const gameEnv: Record<string, string> = {
			...sharedEnv,
			DYNAMODB_GAMES_TABLE: dynamoDbConstruct.gamesTable.tableName,
			DYNAMODB_GAME_VERSIONS_TABLE: dynamoDbConstruct.gameVersionsTable.tableName,
		};

		const authLambdas = new AuthLambdasConstruct(this, 'AuthLambdas', {
			stageName,
			role: iamConstruct.authLambdaRole,
			environment: sharedEnv,
		});

		const gameLambdas = new GameLambdasConstruct(this, 'GameLambdas', {
			stageName,
			role: iamConstruct.gameLambdaRole,
			environment: gameEnv,
		});

		const apiConstruct = new ApiConstruct(this, 'Api', {
			stageName,
			domainName: env.domainName,
			certificateArn: env.certificateArn,
			hostedZoneId: env.hostedZoneId,
			hostedZoneName: env.hostedZoneName,
			authLambdas,
			gameLambdas,
		});

		new cdk.CfnOutput(this, `ApiUrl${stageName}`, {
			value: apiConstruct.api.url,
			description: 'Base URL of the OINA API',
		});
		new cdk.CfnOutput(this, `DocsUrl${stageName}`, {
			value: `${apiConstruct.api.url}docs`,
			description: 'Swagger UI URL of the OINA API',
		});
		new cdk.CfnOutput(this, `UserPoolId${stageName}`, {
			value: cognitoConstruct.userPool.userPoolId,
			description: 'Cognito User Pool ID',
		});
		new cdk.CfnOutput(this, `UserPoolClientId${stageName}`, {
			value: cognitoConstruct.userPoolClient.userPoolClientId,
			description: 'Cognito User Pool Client ID',
		});
	}
}
