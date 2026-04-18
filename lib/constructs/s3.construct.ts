import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface S3ConstructProps {
	stageName: string;
}

export class S3Construct extends Construct {
	public readonly avatarBucket: s3.Bucket;

	constructor(scope: Construct, id: string, props: S3ConstructProps) {
		super(scope, id);

		const { stageName } = props;

		this.avatarBucket = new s3.Bucket(this, `AvatarBucket${stageName}`, {
			bucketName: `oina-avatars-${stageName}`,
			publicReadAccess: true,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
			cors: [
				{
					allowedMethods: [s3.HttpMethods.PUT],
					allowedOrigins: ['*'],
					allowedHeaders: ['*'],
					maxAge: 3000,
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});
	}
}
