import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

interface GiftLambdasConstructProps {
	stageName: string;
	role: iam.IRole;
	environment: Record<string, string>;
}

export class GiftLambdasConstruct extends Construct {
	public readonly generateGiftFn: lambdaNodejs.NodejsFunction;
	public readonly getGiftFn: lambdaNodejs.NodejsFunction;

	constructor(scope: Construct, id: string, props: GiftLambdasConstructProps) {
		super(scope, id);

		const { stageName, role, environment } = props;

		const createFn = (fnId: string, entry: string) =>
			new lambdaNodejs.NodejsFunction(this, `${fnId}${stageName}`, {
				functionName: `oina-gift-${fnId.toLowerCase().replace(/lambda$/, '')}-${stageName}`,
				entry: path.join(__dirname, '../../src/handlers/gifts', entry),
				handler: 'handler',
				runtime: lambda.Runtime.NODEJS_22_X,
				role,
				timeout: cdk.Duration.seconds(30),
				memorySize: 256,
				logRetention: logs.RetentionDays.TWO_WEEKS,
				bundling: {
					minify: false,
					sourceMap: true,
					externalModules: [],
				},
				environment,
			});

		this.generateGiftFn = createFn('GenerateLambda', 'generate-gift.ts');
		this.getGiftFn = createFn('GetLambda', 'get-gift.ts');
	}
}
