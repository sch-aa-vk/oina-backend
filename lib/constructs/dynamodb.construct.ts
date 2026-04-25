import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DynamoDbConstructProps {
	stageName: string;
}

export class DynamoDbConstruct extends Construct {
	public readonly usersTable: dynamodb.Table;
	public readonly otpCodesTable: dynamodb.Table;
	public readonly tokenBlacklistTable: dynamodb.Table;
	public readonly gamesTable: dynamodb.Table;
	public readonly gameVersionsTable: dynamodb.Table;
	public readonly giftsTable: dynamodb.Table;
	public readonly gameResultsTable: dynamodb.Table;
	public readonly gameLikesTable: dynamodb.Table;
	public readonly gameViewsTable: dynamodb.Table;

	constructor(scope: Construct, id: string, props: DynamoDbConstructProps) {
		super(scope, id);

		const { stageName } = props;

		this.usersTable = new dynamodb.Table(this, `UsersTable${stageName}`, {
			tableName: `oina-users-${stageName}`,
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		this.usersTable.addGlobalSecondaryIndex({
			indexName: 'email-index',
			partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
		});
		this.usersTable.addGlobalSecondaryIndex({
			indexName: 'username-index',
			partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
		});

		this.otpCodesTable = new dynamodb.Table(this, `OTPCodesTable${stageName}`, {
			tableName: `oina-otp-codes-${stageName}`,
			partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'type', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			timeToLiveAttribute: 'expiresAt',
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		this.tokenBlacklistTable = new dynamodb.Table(this, `TokenBlacklistTable${stageName}`, {
			tableName: `oina-token-blacklist-${stageName}`,
			partitionKey: { name: 'jti', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			timeToLiveAttribute: 'expiresAt',
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		this.tokenBlacklistTable.addGlobalSecondaryIndex({
			indexName: 'userId-blacklistedAt-index',
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'blacklistedAt', type: dynamodb.AttributeType.STRING },
		});

		this.gamesTable = new dynamodb.Table(this, `GamesTable${stageName}`, {
			tableName: `oina-games-${stageName}`,
			partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		this.gamesTable.addGlobalSecondaryIndex({
			indexName: 'userId-createdAt-index',
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});
		this.gamesTable.addGlobalSecondaryIndex({
			indexName: 'visibility-createdAt-index',
			partitionKey: { name: 'visibility', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});
		this.gamesTable.addGlobalSecondaryIndex({
			indexName: 'visibility-likeCount-index',
			partitionKey: { name: 'visibility', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'likeCount', type: dynamodb.AttributeType.NUMBER },
		});
		this.gamesTable.addGlobalSecondaryIndex({
			indexName: 'shareLink-index',
			partitionKey: { name: 'shareLink', type: dynamodb.AttributeType.STRING },
		});
		this.gamesTable.addGlobalSecondaryIndex({
			indexName: 'category-likeCount-index',
			partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'likeCount', type: dynamodb.AttributeType.NUMBER },
		});

		this.gameVersionsTable = new dynamodb.Table(this, `GameVersionsTable${stageName}`, {
			tableName: `oina-game-versions-${stageName}`,
			partitionKey: { name: 'versionId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		this.gameVersionsTable.addGlobalSecondaryIndex({
			indexName: 'gameId-createdAt-index',
			partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});

		this.gameLikesTable = new dynamodb.Table(this, `GameLikesTable${stageName}`, {
			tableName: `oina-game-likes-${stageName}`,
			partitionKey: { name: 'likeKey', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		this.gameViewsTable = new dynamodb.Table(this, `GameViewsTable${stageName}`, {
			tableName: `oina-game-views-${stageName}`,
			partitionKey: { name: 'viewKey', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			timeToLiveAttribute: 'expiresAt',
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		this.giftsTable = new dynamodb.Table(this, `GiftsTable${stageName}`, {
			tableName: `oina-gifts-${stageName}`,
			partitionKey: { name: 'giftId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		this.giftsTable.addGlobalSecondaryIndex({
			indexName: 'userId-createdAt-index',
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
		});

		this.gameResultsTable = new dynamodb.Table(this, `GameResultsTable${stageName}`, {
			tableName: `oina-game-results-${stageName}`,
			partitionKey: { name: 'gameResultId', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});
		this.gameResultsTable.addGlobalSecondaryIndex({
			indexName: 'userId-playedAt-index',
			partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'playedAt', type: dynamodb.AttributeType.STRING },
		});
		this.gameResultsTable.addGlobalSecondaryIndex({
			indexName: 'gameId-playedAt-index',
			partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
			sortKey: { name: 'playedAt', type: dynamodb.AttributeType.STRING },
		});
	}
}
