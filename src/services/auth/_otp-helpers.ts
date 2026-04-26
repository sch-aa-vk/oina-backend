import { GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { OTPRecord, OTPType } from '../../types/auth.types';
import { docClient, OTP_TABLE } from './_client';

export const getActiveOTP = async (email: string, type: OTPType): Promise<OTPRecord | null> => {
  const result = await docClient.send(new GetCommand({
    TableName: OTP_TABLE,
    Key: { email, type },
  }));

  return (result.Item as OTPRecord) ?? null;
};

export const deleteExistingOTP = async (email: string, type: OTPType): Promise<void> => {
  await docClient.send(new DeleteCommand({
    TableName: OTP_TABLE,
    Key: { email, type },
  }));
};

export const incrementOTPAttempts = async (email: string, type: OTPType, currentAttempts: number): Promise<void> => {
  await docClient.send(new UpdateCommand({
    TableName: OTP_TABLE,
    Key: { email, type },
    UpdateExpression: 'SET attempts = :attempts',
    ExpressionAttributeValues: { ':attempts': currentAttempts + 1 },
  }));
};
