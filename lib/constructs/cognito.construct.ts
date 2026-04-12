import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

interface CognitoConstructProps {
	stageName: string;
}

export class CognitoConstruct extends Construct {
	public readonly userPool: cognito.UserPool;
	public readonly userPoolClient: cognito.UserPoolClient;

	constructor(scope: Construct, id: string, props: CognitoConstructProps) {
		super(scope, id);

		const { stageName } = props;

		this.userPool = new cognito.UserPool(this, `OinaUserPool${stageName}`, {
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

		this.userPoolClient = new cognito.UserPoolClient(this, `OinaUserPoolClient${stageName}`, {
			userPool: this.userPool,
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
	}
}
