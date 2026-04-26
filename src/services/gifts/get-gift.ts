import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { GetGiftResponse, GiftRecord } from '../../types/gift.types';
import { Errors } from '../../utils/errors';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const GIFTS_TABLE = process.env.DYNAMODB_GIFTS_TABLE!;
const GIFTS_BUCKET = process.env.GIFTS_BUCKET_NAME!;

export async function getGift(giftId: string): Promise<GetGiftResponse> {
  const result = await docClient.send(new GetCommand({
    TableName: GIFTS_TABLE,
    Key: { giftId },
  }));

  if (!result.Item) {
    throw Errors.GIFT_NOT_FOUND();
  }

  const record = result.Item as GiftRecord;

  if (record.status !== 'READY') {
    return { status: record.status };
  }

  const s3Response = await s3Client.send(new GetObjectCommand({
    Bucket: GIFTS_BUCKET,
    Key: record.s3Key,
  }));

  const html = await s3Response.Body!.transformToString('utf-8');

  return { status: 'READY', html };
}
