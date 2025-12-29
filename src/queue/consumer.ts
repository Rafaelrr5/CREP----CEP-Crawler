import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { getSQSClient, getQueueUrl } from '../config/queue';
import logger from '../utils/logger';
import { parseCepMessage, CepMessage } from './types';

export interface QueueMessage {
  messageId: string;
  receiptHandle: string;
  body: CepMessage;
}

export class QueueConsumer {
  private sqs = getSQSClient();
  private queueUrl: string;
  private isRunning = false;
  private queueType: 'primary' | 'dlq';

  constructor(queueType: 'primary' | 'dlq' = 'primary') {
    this.queueType = queueType;
    this.queueUrl = getQueueUrl(queueType);
  }

  async receiveMessages(maxMessages: number = 10): Promise<QueueMessage[]> {
    const params = {
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20, // Long polling
      VisibilityTimeout: 30,
      MessageAttributeNames: ['All'],
    };

    try {
      const result = await this.sqs.send(new ReceiveMessageCommand(params));

      if (!result.Messages || result.Messages.length === 0) {
        return [];
      }

      return result.Messages.map((msg) => ({
        messageId: msg.MessageId!,
        receiptHandle: msg.ReceiptHandle!,
        body: parseCepMessage(msg.Body!),
      }));
    } catch (error) {
      logger.error({ err: error, queueUrl: this.queueUrl }, 'Erro ao receber mensagens da fila');
      return [];
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const params = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    };

    try {
      await this.sqs.send(new DeleteMessageCommand(params));
    } catch (error) {
      logger.error({ err: error, queueUrl: this.queueUrl }, 'Erro ao deletar mensagem da fila');
      throw error;
    }
  }

  start(): void {
    this.isRunning = true;
    logger.info({ queueUrl: this.queueUrl, queueType: this.queueType }, 'Queue consumer started');
  }

  stop(): void {
    this.isRunning = false;
    logger.info({ queueUrl: this.queueUrl, queueType: this.queueType }, 'Queue consumer stopped');
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getQueueType(): 'primary' | 'dlq' {
    return this.queueType;
  }
}
