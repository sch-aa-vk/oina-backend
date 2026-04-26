import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface IamConstructProps {
	stageName: string;
	usersTable: dynamodb.Table;
	otpCodesTable: dynamodb.Table;
	tokenBlacklistTable: dynamodb.Table;
	gamesTable: dynamodb.Table;
	gameVersionsTable: dynamodb.Table;
	gameResultsTable: dynamodb.Table;
	gameLikesTable: dynamodb.Table;
	gameViewsTable: dynamodb.Table;
	userPool: cognito.UserPool;
	avatarBucket: s3.Bucket;
	gamesCoverBucket: s3.Bucket;
	giftsTable: dynamodb.Table;
	giftsBucket: s3.Bucket;
}

export class IamConstruct extends Construct {
	public readonly authLambdaRole: iam.Role;
	public readonly gameLambdaRole: iam.Role;
	public readonly giftLambdaRole: iam.Role;

	constructor(scope: Construct, id: string, props: IamConstructProps) {
		super(scope, id);

		const { stageName, usersTable, otpCodesTable, tokenBlacklistTable, gamesTable, gameVersionsTable, gameResultsTable, gameLikesTable, gameViewsTable, userPool, avatarBucket, gamesCoverBucket, giftsTable, giftsBucket } =
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
		avatarBucket.grantPut(this.authLambdaRole);
		avatarBucket.grantRead(this.authLambdaRole);

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
		gameResultsTable.grantReadWriteData(this.gameLambdaRole);
		gameLikesTable.grantReadWriteData(this.gameLambdaRole);
		gameViewsTable.grantReadWriteData(this.gameLambdaRole);
		gamesCoverBucket.grantPut(this.gameLambdaRole);
		gamesCoverBucket.grantRead(this.gameLambdaRole);
		tokenBlacklistTable.grantReadData(this.gameLambdaRole);

		this.giftLambdaRole = new iam.Role(this, `GiftLambdaRole${stageName}`, {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
		});
		this.giftLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromManagedPolicyArn(
				this,
				`GiftLambdaBasicExecutionPolicy${stageName}`,
				`arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
			)
		);

		giftsTable.grantReadWriteData(this.giftLambdaRole);
		giftsBucket.grantPut(this.giftLambdaRole);
		giftsBucket.grantRead(this.giftLambdaRole);
		tokenBlacklistTable.grantReadData(this.giftLambdaRole);
		usersTable.grantReadData(this.giftLambdaRole);
	}
}
