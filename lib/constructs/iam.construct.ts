import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface IamConstructProps {
	stageName: string;
	usersTable: dynamodb.Table;
	otpCodesTable: dynamodb.Table;
	tokenBlacklistTable: dynamodb.Table;
	gamesTable: dynamodb.Table;
	gameVersionsTable: dynamodb.Table;
	userPool: cognito.UserPool;
}

export class IamConstruct extends Construct {
	public readonly authLambdaRole: iam.Role;
	public readonly gameLambdaRole: iam.Role;

	constructor(scope: Construct, id: string, props: IamConstructProps) {
		super(scope, id);

		const { stageName, usersTable, otpCodesTable, tokenBlacklistTable, gamesTable, gameVersionsTable, userPool } =
			props;

		this.authLambdaRole = new iam.Role(this, `AuthLambdaRole${stageName}`, {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
		});
		this.authLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromManagedPolicyArn(
				this,
				`AuthLambdaBasicExecutionPolicy${stageName}`,
				`arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
			)
		);

		usersTable.grantReadWriteData(this.authLambdaRole);
		otpCodesTable.grantReadWriteData(this.authLambdaRole);
		tokenBlacklistTable.grantReadWriteData(this.authLambdaRole);

		this.authLambdaRole.addToPolicy(
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

		this.gameLambdaRole = new iam.Role(this, `GameLambdaRole${stageName}`, {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
		});
		this.gameLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromManagedPolicyArn(
				this,
				`GameLambdaBasicExecutionPolicy${stageName}`,
				`arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
			)
		);

		usersTable.grantReadWriteData(this.gameLambdaRole);
		gamesTable.grantReadWriteData(this.gameLambdaRole);
		gameVersionsTable.grantReadWriteData(this.gameLambdaRole);
		tokenBlacklistTable.grantReadData(this.gameLambdaRole);
	}
}
