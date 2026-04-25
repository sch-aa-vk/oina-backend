import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface S3ConstructProps {
	stageName: string;
}

export class S3Construct extends Construct {
	public readonly avatarBucket: s3.Bucket;
	public readonly giftsBucket: s3.Bucket;

	constructor(scope: Construct, id: string, props: S3ConstructProps) {
		super(scope, id);

		const { stageName } = props;

		this.avatarBucket = new s3.Bucket(this, `AvatarBucket${stageName}`, {
			bucketName: `oina-avatars-${stageName}`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			cors: [
				{
					allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
					allowedOrigins: ['*'],
					allowedHeaders: ['*'],
					maxAge: 3000,
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		this.giftsBucket = new s3.Bucket(this, `GiftsBucket${stageName}`, {
			bucketName: `oina-gifts-${stageName}`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			cors: [
				{
					allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
					allowedOrigins: ['*'],
					allowedHeaders: ['*'],
					maxAge: 3000,
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});
	}
}
