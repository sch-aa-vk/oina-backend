import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

interface AuthLambdasConstructProps {
	stageName: string;
	role: iam.IRole;
	environment: Record<string, string>;
}

export class AuthLambdasConstruct extends Construct {
	public readonly registerFn: lambdaNodejs.NodejsFunction;
	public readonly verifyEmailFn: lambdaNodejs.NodejsFunction;
	public readonly resendCodeFn: lambdaNodejs.NodejsFunction;
	public readonly loginFn: lambdaNodejs.NodejsFunction;
	public readonly logoutFn: lambdaNodejs.NodejsFunction;
	public readonly refreshTokenFn: lambdaNodejs.NodejsFunction;
	public readonly forgotPasswordFn: lambdaNodejs.NodejsFunction;
	public readonly resetPasswordFn: lambdaNodejs.NodejsFunction;
	public readonly validateTokenFn: lambdaNodejs.NodejsFunction;
	public readonly docsUiFn: lambdaNodejs.NodejsFunction;
	public readonly openApiFn: lambdaNodejs.NodejsFunction;

	constructor(scope: Construct, id: string, props: AuthLambdasConstructProps) {
		super(scope, id);

		const { stageName, role, environment } = props;

		const createFn = (fnId: string, entry: string) =>
			new lambdaNodejs.NodejsFunction(this, `${fnId}${stageName}`, {
				functionName: `oina-auth-${fnId.toLowerCase().replace(/lambda$/, '')}-${stageName}`,
				entry: path.join(__dirname, '../../src/handlers/auth', entry),
				handler: 'handler',
				runtime: lambda.Runtime.NODEJS_20_X,
				role,
				timeout: cdk.Duration.seconds(30),
				memorySize: 256,
				bundling: {
					minify: false,
					sourceMap: true,
					externalModules: [],
				},
				environment,
			});

		this.registerFn = createFn('RegisterLambda', 'register.ts');
		this.verifyEmailFn = createFn('VerifyEmailLambda', 'verify-email.ts');
		this.resendCodeFn = createFn('ResendCodeLambda', 'resend-code.ts');
		this.loginFn = createFn('LoginLambda', 'login.ts');
		this.logoutFn = createFn('LogoutLambda', 'logout.ts');
		this.refreshTokenFn = createFn('RefreshTokenLambda', 'refresh-token.ts');
		this.forgotPasswordFn = createFn('ForgotPasswordLambda', 'forgot-password.ts');
		this.resetPasswordFn = createFn('ResetPasswordLambda', 'reset-password.ts');
		this.validateTokenFn = createFn('ValidateTokenLambda', 'validate-token.ts');

		this.docsUiFn = new lambdaNodejs.NodejsFunction(this, `DocsUiLambda${stageName}`, {
			functionName: `oina-docs-ui-${stageName}`,
			entry: path.join(__dirname, '../../src/handlers/docs/swagger-ui.ts'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_20_X,
			role,
			timeout: cdk.Duration.seconds(30),
			memorySize: 256,
			bundling: {
				minify: false,
				sourceMap: true,
				externalModules: [],
			},
			environment,
		});

		this.openApiFn = new lambdaNodejs.NodejsFunction(this, `OpenApiLambda${stageName}`, {
			functionName: `oina-openapi-${stageName}`,
			entry: path.join(__dirname, '../../src/handlers/docs/openapi.ts'),
			handler: 'handler',
			runtime: lambda.Runtime.NODEJS_20_X,
			role,
			timeout: cdk.Duration.seconds(30),
			memorySize: 256,
			bundling: {
				minify: false,
				sourceMap: true,
				externalModules: [],
			},
			environment,
		});
	}
}
