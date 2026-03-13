#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { OinaBackendStack } from '../lib/oina-backend-stack';

const app = new cdk.App();
new OinaBackendStack(app, 'OinaBackendStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
