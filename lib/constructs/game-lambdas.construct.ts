import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

interface GameLambdasConstructProps {
	stageName: string;
	role: iam.IRole;
	environment: Record<string, string>;
}

export class GameLambdasConstruct extends Construct {
	public readonly createGameFn: lambdaNodejs.NodejsFunction;
	public readonly listGamesFn: lambdaNodejs.NodejsFunction;
	public readonly getGameFn: lambdaNodejs.NodejsFunction;
	public readonly updateGameFn: lambdaNodejs.NodejsFunction;
	public readonly deleteGameFn: lambdaNodejs.NodejsFunction;
	public readonly publishGameFn: lambdaNodejs.NodejsFunction;
	public readonly unpublishGameFn: lambdaNodejs.NodejsFunction;
	public readonly previewGameFn: lambdaNodejs.NodejsFunction;
	public readonly listGameVersionsFn: lambdaNodejs.NodejsFunction;

	constructor(scope: Construct, id: string, props: GameLambdasConstructProps) {
		super(scope, id);

		const { stageName, role, environment } = props;

		const createFn = (fnId: string, entry: string) =>
			new lambdaNodejs.NodejsFunction(this, `${fnId}${stageName}`, {
				functionName: `oina-game-${fnId.toLowerCase().replace(/lambda$/, '')}-${stageName}`,
				entry: path.join(__dirname, '../../src/handlers/games', entry),
				handler: 'handler',
				runtime: lambda.Runtime.NODEJS_22_X,
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

		this.createGameFn = createFn('CreateGameLambda', 'create-game.ts');
		this.listGamesFn = createFn('ListGamesLambda', 'list-games.ts');
		this.getGameFn = createFn('GetGameLambda', 'get-game.ts');
		this.updateGameFn = createFn('UpdateGameLambda', 'update-game.ts');
		this.deleteGameFn = createFn('DeleteGameLambda', 'delete-game.ts');
		this.publishGameFn = createFn('PublishGameLambda', 'publish-game.ts');
		this.unpublishGameFn = createFn('UnpublishGameLambda', 'unpublish-game.ts');
		this.previewGameFn = createFn('PreviewGameLambda', 'preview-game.ts');
		this.listGameVersionsFn = createFn('ListGameVersionsLambda', 'list-game-versions.ts');
	}
}
