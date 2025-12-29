import { SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { getSQSClient, getQueueUrl } from '../config/queue';
import { createCepMessage } from './types';
import logger from '../utils/logger';

export class QueueProducer {
  private sqs = getSQSClient();
  private queueUrl = getQueueUrl();

  async sendMessage(crawlId: string, cep: string): Promise<void> {
    const message = createCepMessage(crawlId, cep);

    const params = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        crawl_id: {
          DataType: 'String',
          StringValue: crawlId,
        },
        cep: {
          DataType: 'String',
          StringValue: cep,
        },
      },
    };

    try {
      await this.sqs.send(new SendMessageCommand(params));
    } catch (error) {
      logger.error({ err: error, cep, crawlId }, 'Erro ao enviar mensagem para fila');
      throw error;
    }
  }

  async sendBatch(crawlId: string, ceps: string[]): Promise<void> {
    const batchSize = 10; // SQS permite até 10 mensagens por batch
    const batches: string[][] = [];

    // Dividir em batches de 10
    for (let i = 0; i < ceps.length; i += batchSize) {
      batches.push(ceps.slice(i, i + batchSize));
    }

    logger.info({ crawlId, batches: batches.length, total: ceps.length }, 'Enviando mensagens para fila');

    // Processar batches em paralelo (com limite)
    const promises = batches.map((batch, batchIndex) =>
      this.sendBatchInternal(crawlId, batch, batchIndex)
    );

    await Promise.all(promises);

    logger.info({ crawlId, total: ceps.length }, 'Mensagens enfileiradas');
  }

  private async sendBatchInternal(
    crawlId: string,
    ceps: string[],
    batchIndex: number
  ): Promise<void> {
    const entries = ceps.map((cep, index) => {
      const message = createCepMessage(crawlId, cep);
      return {
        Id: `${batchIndex}-${index}`,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          crawl_id: {
            DataType: 'String',
            StringValue: crawlId,
          },
          cep: {
            DataType: 'String',
            StringValue: cep,
          },
        },
      };
    });

    const params = {
      QueueUrl: this.queueUrl,
      Entries: entries,
    };

    try {
      const result = await this.sqs.send(new SendMessageBatchCommand(params));

      if (result.Failed && result.Failed.length > 0) {
        logger.warn({ batchIndex, failed: result.Failed }, 'Falhas ao enviar batch');
      }
    } catch (error) {
      logger.error({ err: error, batchIndex }, 'Erro ao enviar batch para fila');
      throw error;
    }
  }
}
