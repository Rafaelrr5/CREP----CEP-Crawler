import pLimit from 'p-limit';
import Bottleneck from 'bottleneck';
import { connectToDatabase } from '../config/database';
import { QueueConsumer, QueueMessage } from '../queue/consumer';
import { ViaCepService } from '../services/ViaCepService';
import { CrawlRepository } from '../repositories/CrawlRepository';
import { CepResultRepository } from '../repositories/CepResultRepository';
import WebhookService from '../services/WebhookService';
import logger from '../utils/logger';

const MESSAGE_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '10', 10);
const VIACEP_RATE_PER_SECOND = parseInt(process.env.VIACEP_RATE_LIMIT || '10', 10);
const VIACEP_MAX_CONCURRENT = parseInt(process.env.VIACEP_RATE_LIMIT_CONCURRENCY || '5', 10);
const WORKER_QUEUE_TYPE = (process.env.WORKER_QUEUE_TYPE as 'primary' | 'dlq') || 'primary';

export class CepWorker {
  private consumer: QueueConsumer;
  private viaCepService: ViaCepService;
  private crawlRepository: CrawlRepository;
  private cepResultRepository: CepResultRepository;
  private webhookService: WebhookService;
  private messageLimit = pLimit(MESSAGE_CONCURRENCY);
  private viaCepLimiter: Bottleneck;
  private isProcessing = false;

  constructor() {
    this.consumer = new QueueConsumer(WORKER_QUEUE_TYPE);
    this.viaCepService = new ViaCepService();
    this.crawlRepository = new CrawlRepository();
    this.cepResultRepository = new CepResultRepository();
    this.webhookService = new WebhookService();
    this.viaCepLimiter = new Bottleneck({
      reservoir: VIACEP_RATE_PER_SECOND,
      reservoirRefreshAmount: VIACEP_RATE_PER_SECOND,
      reservoirRefreshInterval: 1000,
      maxConcurrent: VIACEP_MAX_CONCURRENT,
    });
  }

  async start(): Promise<void> {
    logger.info(
      {
        messageConcurrency: MESSAGE_CONCURRENCY,
        viacepRatePerSecond: VIACEP_RATE_PER_SECOND,
        viacepMaxConcurrent: VIACEP_MAX_CONCURRENT,
        queueType: WORKER_QUEUE_TYPE,
      },
      'Iniciando worker'
    );

    await connectToDatabase();

    this.consumer.start();

    // Loop principal
    while (this.consumer.getIsRunning()) {
      try {
        await this.processMessages();
      } catch (error) {
        logger.error({ err: error }, 'Erro no loop principal do worker');
        await this.sleep(5000);
      }
    }
  }

  private async processMessages(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const messages = await this.consumer.receiveMessages(MESSAGE_CONCURRENCY);

      if (messages.length === 0) {
        this.isProcessing = false;
        return;
      }

      logger.info({ count: messages.length }, 'Mensagens recebidas');

      const promises = messages.map((message) =>
        this.messageLimit(() => this.processMessage(message))
      );

      await Promise.allSettled(promises);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMessage(message: QueueMessage): Promise<void> {
    const { crawl_id, cep } = message.body;

    logger.info({ crawl_id, cep }, 'Processando CEP');

    // Marcar crawl como running na primeira vez
    const crawl = await this.crawlRepository.findById(crawl_id);
    if (crawl && crawl.status === 'pending') {
      await this.crawlRepository.setRunning(crawl_id);
    }

    try {
      const data = await this.viaCepLimiter.schedule(() => this.viaCepService.consultarCep(cep));

      // Salvar resultado
      await this.cepResultRepository.create({
        crawl_id,
        cep,
        data,
        status: data ? 'success' : 'error',
        error_message: data ? null : 'CEP não encontrado',
      });

      // Atualizar contadores
      await this.crawlRepository.incrementProcessed(crawl_id, data !== null);

      // Verificar se finalizou
      const finishedCrawl = await this.crawlRepository.checkIfFinished(crawl_id);

      if (finishedCrawl) {
        await this.webhookService.notifyCrawlFinished(finishedCrawl);
      }

      await this.consumer.deleteMessage(message.receiptHandle);

      logger.info({ crawl_id, cep }, 'CEP processado com sucesso');
    } catch (error) {
      logger.error(
        { err: error, crawl_id, cep, queueType: this.consumer.getQueueType() },
        'Erro ao processar CEP'
      );

      if (this.consumer.getQueueType() === 'dlq') {
        await this.cepResultRepository.create({
          crawl_id,
          cep,
          data: null,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
        });

        await this.crawlRepository.incrementProcessed(crawl_id, false);
        const finishedCrawl = await this.crawlRepository.checkIfFinished(crawl_id);
        if (finishedCrawl) {
          await this.webhookService.notifyCrawlFinished(finishedCrawl);
        }
        await this.consumer.deleteMessage(message.receiptHandle);

        logger.warn({ crawl_id, cep }, 'Mensagem DLQ marcada como falha definitiva');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop(): void {
    logger.info('🛑 Parando worker...');
    this.consumer.stop();
  }
}

// Iniciar worker se executado diretamente
if (require.main === module) {
  const worker = new CepWorker();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Recebido SIGTERM, encerrando...');
    worker.stop();
  });

  process.on('SIGINT', () => {
    logger.info('Recebido SIGINT, encerrando...');
    worker.stop();
  });

  worker.start().catch((error) => {
    logger.fatal({ err: error }, 'Erro fatal no worker');
    process.exit(1);
  });
}
