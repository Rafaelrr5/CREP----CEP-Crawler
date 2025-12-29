import { SQSClient, SQSClientConfig } from '@aws-sdk/client-sqs';
import logger from '../utils/logger';

type QueueType = 'primary' | 'dlq';

let sqsClient: SQSClient | null = null;

export const getSQSClient = (): SQSClient => {
  if (sqsClient) {
    return sqsClient;
  }

  const config: SQSClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    },
  };

  if (process.env.SQS_ENDPOINT) {
    config.endpoint = process.env.SQS_ENDPOINT;
  }

  sqsClient = new SQSClient(config);
  logger.info({ endpoint: config.endpoint, region: config.region }, 'SQS client configured');

  return sqsClient;
};

export const getQueueUrl = (queueType: QueueType = 'primary'): string => {
  const envVar = queueType === 'dlq' ? 'SQS_DLQ_URL' : 'SQS_QUEUE_URL';
  const queueUrl = process.env[envVar];

  if (!queueUrl) {
    throw new Error(`${envVar} não configurado`);
  }

  return queueUrl;
};
