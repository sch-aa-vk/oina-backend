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

		const sharedEnv: Record<string, string> = {
			STAGE_NAME: stageName,
			DYNAMODB_USERS_TABLE: usersTable.tableName,
			DYNAMODB_OTP_TABLE: otpCodesTable.tableName,
			DYNAMODB_BLACKLIST_TABLE: tokenBlacklistTable.tableName,
			COGNITO_USER_POOL_ID: userPool.userPoolId,
			COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
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

		const addPost = (resource: apigateway.Resource, routePath: string, fn: lambda.Function) => {
			const child = resource.addResource(routePath);
			child.addMethod('POST', new apigateway.LambdaIntegration(fn));
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

		if (domainName && certificateArn && hostedZoneId) {
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

			const hostedZone = route53.HostedZone.fromHostedZoneId(
				this,
				`HostedZone${stageName}`,
				hostedZoneId
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
