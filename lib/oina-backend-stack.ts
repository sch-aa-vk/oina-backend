import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import * as path from 'path';

export class OinaBackendStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const stageName = process.env.STAGE_NAME ?? 'dev';
		const domainName = process.env.DOMAIN_NAME;
		const certificateArn = process.env.CERTIFICATE_ARN;
		const hostedZoneId = process.env.HOSTED_ZONE_ID;
		const hostedZoneName = process.env.HOSTED_ZONE_NAME;
		const smtpHost = process.env.SMTP_HOST ?? '';
		const smtpPort = process.env.SMTP_PORT ?? '';
		const smtpUser = process.env.SMTP_USER ?? '';
		const smtpPassword = process.env.SMTP_PASSWORD ?? '';
		const smtpFrom = process.env.SMTP_FROM ?? '';
		const jwtSecret = process.env.JWT_SECRET ?? '';

		if (!jwtSecret) {
			throw new Error('Missing required environment variable: JWT_SECRET');
		}

		const userPool = new cognito.UserPool(this, `OinaUserPool${stageName}`, {
			userPoolName: `oina-user-pool-${stageName}`,
			selfSignUpEnabled: false,
			signInAliases: { email: true },
			autoVerify: { email: false },
			passwordPolicy: {
				minLength: 8,
				requireUppercase: true,
				requireLowercase: true,
				requireDigits: true,
				requireSymbols: true,
			},
			accountRecovery: cognito.AccountRecovery.NONE,
			email: cognito.UserPoolEmail.withCognito(),
			customAttributes: {
				userId: new cognito.StringAttribute({ mutable: false }),
			},
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		const userPoolClient = new cognito.UserPoolClient(this, `OinaUserPoolClient${stageName}`, {
			userPool,
			userPoolClientName: `oina-backend-client-${stageName}`,
			authFlows: {
				adminUserPassword: true,
				userPassword: false,
				userSrp: false,
				custom: false,
			},
			accessTokenValidity: cdk.Duration.hours(1),
			refreshTokenValidity: cdk.Duration.days(7),
			idTokenValidity: cdk.Duration.hours(1),
			generateSecret: false,
			preventUserExistenceErrors: true,
		});

		const usersTable = new dynamodb.Table(this, `UsersTable${stageName}`, {
			tableName: `oina-users-${stageName}`,
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		usersTable.addGlobalSecondaryIndex({
			indexName: 'email-index',
			partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
		});
		usersTable.addGlobalSecondaryIndex({
			indexName: 'username-index',
			partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
		});

		const otpCodesTable = new dynamodb.Table(this, `OTPCodesTable${stageName}`, {
			tableName: `oina-otp-codes-${stageName}`,
			partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'type', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			timeToLiveAttribute: 'expiresAt',
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		const tokenBlacklistTable = new dynamodb.Table(this, `TokenBlacklistTable${stageName}`, {
			tableName: `oina-token-blacklist-${stageName}`,
			partitionKey: { name: 'jti', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			timeToLiveAttribute: 'expiresAt',
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		tokenBlacklistTable.addGlobalSecondaryIndex({
			indexName: 'userId-blacklistedAt-index',
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'blacklistedAt', type: dynamodb.AttributeType.STRING },
		});

		// ── Phase 3: Games tables ──────────────────────────────────────────────────

		const gamesTable = new dynamodb.Table(this, `GamesTable${stageName}`, {
			tableName: `oina-games-${stageName}`,
			partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		gamesTable.addGlobalSecondaryIndex({
			indexName: 'userId-createdAt-index',
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});
		gamesTable.addGlobalSecondaryIndex({
			indexName: 'visibility-createdAt-index',
			partitionKey: { name: 'visibility', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});
		gamesTable.addGlobalSecondaryIndex({
			indexName: 'visibility-likeCount-index',
			partitionKey: { name: 'visibility', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'likeCount', type: dynamodb.AttributeType.NUMBER },
		});
		gamesTable.addGlobalSecondaryIndex({
			indexName: 'shareLink-index',
			partitionKey: { name: 'shareLink', type: dynamodb.AttributeType.STRING },
		});
		gamesTable.addGlobalSecondaryIndex({
			indexName: 'category-likeCount-index',
			partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'likeCount', type: dynamodb.AttributeType.NUMBER },
		});

		const gameVersionsTable = new dynamodb.Table(this, `GameVersionsTable${stageName}`, {
			tableName: `oina-game-versions-${stageName}`,
			partitionKey: { name: 'versionId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		gameVersionsTable.addGlobalSecondaryIndex({
			indexName: 'gameId-createdAt-index',
			partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});

		const authLambdaRole = new iam.Role(this, `AuthLambdaRole${stageName}`, {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
		});
		authLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromManagedPolicyArn(
				this,
				`AuthLambdaBasicExecutionPolicy${stageName}`,
				`arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
			)
		);

		usersTable.grantReadWriteData(authLambdaRole);
		otpCodesTable.grantReadWriteData(authLambdaRole);
		tokenBlacklistTable.grantReadWriteData(authLambdaRole);

		authLambdaRole.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					'cognito-idp:AdminCreateUser',
					'cognito-idp:AdminSetUserPassword',
					'cognito-idp:AdminGetUser',
					'cognito-idp:AdminDeleteUser',
					'cognito-idp:AdminUpdateUserAttributes',
				],
				resources: [userPool.userPoolArn],
			})
		);

		// ── Phase 3: Game Lambda IAM role ──────────────────────────────────────────

		const gameLambdaRole = new iam.Role(this, `GameLambdaRole${stageName}`, {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
		});
		gameLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromManagedPolicyArn(
				this,
				`GameLambdaBasicExecutionPolicy${stageName}`,
				`arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
			)
		);
		usersTable.grantReadWriteData(gameLambdaRole);
		gamesTable.grantReadWriteData(gameLambdaRole);
		gameVersionsTable.grantReadWriteData(gameLambdaRole);
		tokenBlacklistTable.grantReadData(gameLambdaRole);

		const sharedEnv: Record<string, string> = {
			STAGE_NAME: stageName,
			DYNAMODB_USERS_TABLE: usersTable.tableName,
			DYNAMODB_OTP_TABLE: otpCodesTable.tableName,
			DYNAMODB_BLACKLIST_TABLE: tokenBlacklistTable.tableName,
			COGNITO_USER_POOL_ID: userPool.userPoolId,
			COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
			JWT_SECRET: jwtSecret,
			SMTP_HOST: smtpHost,
			SMTP_PORT: smtpPort,
			SMTP_USER: smtpUser,
			SMTP_PASSWORD: smtpPassword,
			SMTP_FROM: smtpFrom,
		};

		const gameEnv: Record<string, string> = {
			...sharedEnv,
			DYNAMODB_GAMES_TABLE: gamesTable.tableName,
			DYNAMODB_GAME_VERSIONS_TABLE: gameVersionsTable.tableName,
		};

		const createAuthLambda = (id: string, entry: string) =>
			new lambdaNodejs.NodejsFunction(this, `${id}${stageName}`, {
				functionName: `oina-auth-${id.toLowerCase().replace(/lambda$/, '')}-${stageName}`,
				entry: path.join(__dirname, '../src/handlers/auth', entry),
				handler: 'handler',
				runtime: lambda.Runtime.NODEJS_20_X,
				role: authLambdaRole,
				timeout: cdk.Duration.seconds(30),
				memorySize: 256,
				bundling: {
					minify: false,
					sourceMap: true,
					externalModules: [],
				},
				environment: sharedEnv,
			});

		const registerFn = createAuthLambda('RegisterLambda', 'register.ts');
		const verifyEmailFn = createAuthLambda('VerifyEmailLambda', 'verify-email.ts');
		const resendCodeFn = createAuthLambda('ResendCodeLambda', 'resend-code.ts');
		const loginFn = createAuthLambda('LoginLambda', 'login.ts');
		const logoutFn = createAuthLambda('LogoutLambda', 'logout.ts');
		const refreshTokenFn = createAuthLambda('RefreshTokenLambda', 'refresh-token.ts');
		const forgotPasswordFn = createAuthLambda('ForgotPasswordLambda', 'forgot-password.ts');
		const resetPasswordFn = createAuthLambda('ResetPasswordLambda', 'reset-password.ts');
		const validateTokenFn = createAuthLambda('ValidateTokenLambda', 'validate-token.ts');
		const docsUiFn = new lambdaNodejs.NodejsFunction(this, `DocsUiLambda${stageName}`, {
			functionName: `oina-docs-ui-${stageName}`,
			entry: path.join(__dirname, '../src/handlers/docs/swagger-ui.ts'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_20_X,
			role: authLambdaRole,
			timeout: cdk.Duration.seconds(30),
			memorySize: 256,
			bundling: {
				minify: false,
				sourceMap: true,
				externalModules: [],
			},
			environment: sharedEnv,
		});
		const openApiFn = new lambdaNodejs.NodejsFunction(this, `OpenApiLambda${stageName}`, {
			functionName: `oina-openapi-${stageName}`,
			entry: path.join(__dirname, '../src/handlers/docs/openapi.ts'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_20_X,
			role: authLambdaRole,
			timeout: cdk.Duration.seconds(30),
			memorySize: 256,
			bundling: {
				minify: false,
				sourceMap: true,
				externalModules: [],
			},
			environment: sharedEnv,
		});

		// ── Phase 3: Game Lambda functions ─────────────────────────────────────────

		const createGameLambda = (id: string, entry: string) =>
			new lambdaNodejs.NodejsFunction(this, `${id}${stageName}`, {
				functionName: `oina-game-${id.toLowerCase().replace(/lambda$/, '')}-${stageName}`,
				entry: path.join(__dirname, '../src/handlers/games', entry),
				handler: 'handler',
				runtime: lambda.Runtime.NODEJS_20_X,
				role: gameLambdaRole,
				timeout: cdk.Duration.seconds(30),
				memorySize: 256,
				bundling: {
					minify: false,
					sourceMap: true,
					externalModules: [],
				},
				environment: gameEnv,
			});

		const createGameFn = createGameLambda('CreateGameLambda', 'create-game.ts');
		const listGamesFn = createGameLambda('ListGamesLambda', 'list-games.ts');
		const getGameFn = createGameLambda('GetGameLambda', 'get-game.ts');
		const updateGameFn = createGameLambda('UpdateGameLambda', 'update-game.ts');
		const deleteGameFn = createGameLambda('DeleteGameLambda', 'delete-game.ts');
		const publishGameFn = createGameLambda('PublishGameLambda', 'publish-game.ts');
		const unpublishGameFn = createGameLambda('UnpublishGameLambda', 'unpublish-game.ts');
		const previewGameFn = createGameLambda('PreviewGameLambda', 'preview-game.ts');
		const listGameVersionsFn = createGameLambda('ListGameVersionsLambda', 'list-game-versions.ts');

		const api = new apigateway.RestApi(this, `OinaApi${stageName}`, {
			restApiName: `oina-api-${stageName}`,
			description: 'OINA Backend API',
			defaultCorsPreflightOptions: {
				allowOrigins: apigateway.Cors.ALL_ORIGINS,
				allowMethods: apigateway.Cors.ALL_METHODS,
				allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
			},
			deployOptions: {
				stageName,
			},
		});

		const authResource = api.root.addResource('auth');

		const addPost = (resource: apigateway.IResource, routePath: string, fn: lambda.IFunction) => {
			const child = resource.addResource(routePath);
			child.addMethod('POST', new apigateway.LambdaIntegration(fn));
			return child;
		};
		const addGet = (resource: apigateway.IResource, routePath: string, fn: lambda.IFunction) => {
			const child = resource.addResource(routePath);
			child.addMethod('GET', new apigateway.LambdaIntegration(fn));
			return child;
		};

		addPost(authResource, 'register', registerFn);
		addPost(authResource, 'verify-email', verifyEmailFn);
		addPost(authResource, 'resend-verification-code', resendCodeFn);
		addPost(authResource, 'login', loginFn);
		addPost(authResource, 'logout', logoutFn);
		addPost(authResource, 'refresh-token', refreshTokenFn);
		addPost(authResource, 'forgot-password', forgotPasswordFn);
		addPost(authResource, 'reset-password', resetPasswordFn);
		addPost(authResource, 'validate-token', validateTokenFn);
		addGet(api.root, 'docs', docsUiFn);
		addGet(api.root, 'openapi.json', openApiFn);

		// ── Phase 3: Games routes ──────────────────────────────────────────────────

		const gamesResource = api.root.addResource('games');
		gamesResource.addMethod('POST', new apigateway.LambdaIntegration(createGameFn));
		gamesResource.addMethod('GET', new apigateway.LambdaIntegration(listGamesFn));

		const gameIdResource = gamesResource.addResource('{gameId}');
		gameIdResource.addMethod('GET', new apigateway.LambdaIntegration(getGameFn));
		gameIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateGameFn));
		gameIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteGameFn));

		gameIdResource.addResource('publish').addMethod('POST', new apigateway.LambdaIntegration(publishGameFn));
		gameIdResource.addResource('unpublish').addMethod('POST', new apigateway.LambdaIntegration(unpublishGameFn));
		gameIdResource.addResource('preview').addMethod('GET', new apigateway.LambdaIntegration(previewGameFn));
		gameIdResource.addResource('versions').addMethod('GET', new apigateway.LambdaIntegration(listGameVersionsFn));

		if (domainName && certificateArn && hostedZoneId && hostedZoneName) {
			const certificate = certificatemanager.Certificate.fromCertificateArn(
				this,
				`ApiCertificate${stageName}`,
				certificateArn
			);

			const customDomain = new apigateway.DomainName(this, `ApiDomain${stageName}`, {
				domainName,
				certificate,
				endpointType: apigateway.EndpointType.REGIONAL,
				securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
			});

			new apigateway.BasePathMapping(this, `ApiBasePathMapping${stageName}`, {
				domainName: customDomain,
				restApi: api,
				stage: api.deploymentStage,
			});

			const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
				this,
				`HostedZone${stageName}`,
				{
					hostedZoneId,
					zoneName: hostedZoneName,
				}
			);

			new route53.ARecord(this, `ApiAliasRecord${stageName}`, {
				zone: hostedZone,
				recordName: domainName,
				target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain)),
			});
		}

		new cdk.CfnOutput(this, `ApiUrl${stageName}`, {
			value: api.url,
			description: 'Base URL of the OINA API',
		});
		new cdk.CfnOutput(this, `DocsUrl${stageName}`, {
			value: `${api.url}docs`,
			description: 'Swagger UI URL of the OINA API',
		});
		new cdk.CfnOutput(this, `UserPoolId${stageName}`, {
			value: userPool.userPoolId,
			description: 'Cognito User Pool ID',
		});
		new cdk.CfnOutput(this, `UserPoolClientId${stageName}`, {
			value: userPoolClient.userPoolClientId,
			description: 'Cognito User Pool Client ID',
		});
	}
}
