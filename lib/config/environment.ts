export interface StackEnvironment {
	stageName: string;
	domainName: string;
	certificateArn: string;
	hostedZoneId: string;
	hostedZoneName: string;
	smtpHost: string;
	smtpPort: string;
	smtpUser: string;
	smtpPassword: string;
	smtpFrom: string;
	jwtSecret: string;
	geminiApiKey: string;
}

export function loadEnvironment(): StackEnvironment {
	const required: Record<string, string | undefined> = {
		STAGE_NAME: process.env.STAGE_NAME,
		DOMAIN_NAME: process.env.DOMAIN_NAME,
		CERTIFICATE_ARN: process.env.CERTIFICATE_ARN,
		HOSTED_ZONE_ID: process.env.HOSTED_ZONE_ID,
		HOSTED_ZONE_NAME: process.env.HOSTED_ZONE_NAME,
		JWT_SECRET: process.env.JWT_SECRET,
		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT,
		SMTP_USER: process.env.SMTP_USER,
		SMTP_PASSWORD: process.env.SMTP_PASSWORD,
		SMTP_FROM: process.env.SMTP_FROM,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
	};

	const missing = Object.entries(required)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
	}

	return {
		stageName: required.STAGE_NAME!,
		domainName: required.DOMAIN_NAME!,
		certificateArn: required.CERTIFICATE_ARN!,
		hostedZoneId: required.HOSTED_ZONE_ID!,
		hostedZoneName: required.HOSTED_ZONE_NAME!,
		smtpHost: required.SMTP_HOST!,
		smtpPort: required.SMTP_PORT!,
		smtpUser: required.SMTP_USER!,
		smtpPassword: required.SMTP_PASSWORD!,
		smtpFrom: required.SMTP_FROM!,
		jwtSecret: required.JWT_SECRET!,
		geminiApiKey: required.GEMINI_API_KEY!,
	};
}
