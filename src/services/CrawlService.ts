import { CrawlRepository } from '../repositories/CrawlRepository';
import { CepResultRepository } from '../repositories/CepResultRepository';
import { QueueProducer } from '../queue/producer';
import { Crawl } from '../models/Crawl';
import { CepResult } from '../models/CepResult';
import logger from '../utils/logger';

export class CrawlService {
  private crawlRepository: CrawlRepository;
  private cepResultRepository: CepResultRepository;
  private queueProducer: QueueProducer;

  constructor() {
    this.crawlRepository = new CrawlRepository();
    this.cepResultRepository = new CepResultRepository();
    this.queueProducer = new QueueProducer();
  }

  async startCrawl(
    crawlId: string,
    cepStart: string,
    cepEnd: string,
    ceps: string[]
  ): Promise<void> {
    try {
      // Criar registro do crawl no MongoDB
      await this.crawlRepository.create({
        _id: crawlId,
        cep_start: cepStart,
        cep_end: cepEnd,
        total: ceps.length,
      });

      logger.info({ crawlId }, 'Crawl criado no banco de dados');

      // Enviar mensagens para a fila em batches
      await this.queueProducer.sendBatch(crawlId, ceps);

      logger.info({ crawlId, total: ceps.length }, 'Mensagens enviadas para a fila');
    } catch (error) {
      logger.error({ err: error, crawlId }, 'Erro ao iniciar crawl');

      // Marcar como falho no banco
      await this.crawlRepository.updateStatus(crawlId, 'failed');

      throw error;
    }
  }

  async getCrawlStatus(crawlId: string): Promise<Crawl | null> {
    return this.crawlRepository.findById(crawlId);
  }

  async getCrawlResults(
    crawlId: string,
    page: number,
    limit: number
  ): Promise<{ data: CepResult[]; total: number } | null> {
    // Verificar se o crawl existe
    const crawl = await this.crawlRepository.findById(crawlId);
    if (!crawl) {
      return null;
    }

    // Buscar resultados paginados
    return this.cepResultRepository.findByCrawlId(crawlId, page, limit);
  }

  async getDashboardSummary() {
    return this.crawlRepository.getSummary();
  }
}
