#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { OinaBackendStack } from '../lib/oina-backend-stack';

const app = new cdk.App();
const stageName = process.env.STAGE_NAME ?? 'dev';

new OinaBackendStack(app, `OinaBackendStack-${stageName}`, {
  stackName: `oina-backend-${stageName}`,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
