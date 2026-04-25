import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { AuthLambdasConstruct } from './auth-lambdas.construct';
import { GameLambdasConstruct } from './game-lambdas.construct';
import { GiftLambdasConstruct } from './gift-lambdas.construct';

interface ApiConstructProps {
	stageName: string;
	domainName: string;
	certificateArn: string;
	hostedZoneId: string;
	hostedZoneName: string;
	authLambdas: AuthLambdasConstruct;
	gameLambdas: GameLambdasConstruct;
	giftLambdas: GiftLambdasConstruct;
}

export class ApiConstruct extends Construct {
	public readonly api: apigateway.RestApi;

	constructor(scope: Construct, id: string, props: ApiConstructProps) {
		super(scope, id);

		const { stageName, domainName, certificateArn, hostedZoneId, hostedZoneName, authLambdas, gameLambdas, giftLambdas } = props;

		this.api = new apigateway.RestApi(this, `OinaApi${stageName}`, {
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

		this.buildAuthRoutes(authLambdas);
		this.buildGameRoutes(gameLambdas);
		this.buildGiftRoutes(giftLambdas);
		this.setupCustomDomain(stageName, domainName, certificateArn, hostedZoneId, hostedZoneName);
	}

	private addPost(resource: apigateway.IResource, routePath: string, fn: lambda.IFunction) {
		const child = resource.addResource(routePath);
		child.addMethod('POST', new apigateway.LambdaIntegration(fn));
		return child;
	}

	private addGet(resource: apigateway.IResource, routePath: string, fn: lambda.IFunction) {
		const child = resource.addResource(routePath);
		child.addMethod('GET', new apigateway.LambdaIntegration(fn));
		return child;
	}

	private buildAuthRoutes(authLambdas: AuthLambdasConstruct) {
		const authResource = this.api.root.addResource('auth');
		this.addPost(authResource, 'register', authLambdas.registerFn);
		this.addPost(authResource, 'verify-email', authLambdas.verifyEmailFn);
		this.addPost(authResource, 'resend-verification-code', authLambdas.resendCodeFn);
		this.addPost(authResource, 'login', authLambdas.loginFn);
		this.addPost(authResource, 'logout', authLambdas.logoutFn);
		this.addPost(authResource, 'refresh-token', authLambdas.refreshTokenFn);
		this.addPost(authResource, 'forgot-password', authLambdas.forgotPasswordFn);
		this.addPost(authResource, 'reset-password', authLambdas.resetPasswordFn);
		this.addPost(authResource, 'validate-token', authLambdas.validateTokenFn);
		this.addGet(this.api.root, 'docs', authLambdas.docsUiFn);
		this.addGet(this.api.root, 'openapi.json', authLambdas.openApiFn);

		const usersResource = this.api.root.addResource('users');
		const meResource = usersResource.addResource('me');
		meResource.addMethod('GET', new apigateway.LambdaIntegration(authLambdas.getMeProfileFn));
		meResource.addMethod('PATCH', new apigateway.LambdaIntegration(authLambdas.updateMeProfileFn));
		meResource.addResource('avatar').addMethod('POST', new apigateway.LambdaIntegration(authLambdas.uploadAvatarFn));
	}

	private buildGameRoutes(gameLambdas: GameLambdasConstruct) {
		const gamesResource = this.api.root.addResource('games');
		gamesResource.addMethod('POST', new apigateway.LambdaIntegration(gameLambdas.createGameFn));
		gamesResource.addMethod('GET', new apigateway.LambdaIntegration(gameLambdas.listGamesFn));

		const gameIdResource = gamesResource.addResource('{gameId}');
		gameIdResource.addMethod('GET', new apigateway.LambdaIntegration(gameLambdas.getGameFn));
		gameIdResource.addMethod('PUT', new apigateway.LambdaIntegration(gameLambdas.updateGameFn));
		gameIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(gameLambdas.deleteGameFn));

		gameIdResource.addResource('publish').addMethod('POST', new apigateway.LambdaIntegration(gameLambdas.publishGameFn));
		gameIdResource
			.addResource('unpublish')
			.addMethod('POST', new apigateway.LambdaIntegration(gameLambdas.unpublishGameFn));
		gameIdResource.addResource('preview').addMethod('GET', new apigateway.LambdaIntegration(gameLambdas.previewGameFn));
		gameIdResource
			.addResource('versions')
			.addMethod('GET', new apigateway.LambdaIntegration(gameLambdas.listGameVersionsFn));
	}

	private buildGiftRoutes(giftLambdas: GiftLambdasConstruct) {
		const giftsResource = this.api.root.addResource('gifts');
		giftsResource.addResource('generate').addMethod('POST', new apigateway.LambdaIntegration(giftLambdas.generateGiftFn));
		giftsResource.addResource('{giftId}').addMethod('GET', new apigateway.LambdaIntegration(giftLambdas.getGiftFn));
	}

	private setupCustomDomain(
		stageName: string,
		domainName: string,
		certificateArn: string,
		hostedZoneId: string,
		hostedZoneName: string
	) {
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
			restApi: this.api,
			stage: this.api.deploymentStage,
		});

		const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone${stageName}`, {
			hostedZoneId,
			zoneName: hostedZoneName,
		});

		new route53.ARecord(this, `ApiAliasRecord${stageName}`, {
			zone: hostedZone,
			recordName: domainName,
			target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain)),
		});
	}
}
