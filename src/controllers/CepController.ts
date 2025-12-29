import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CrawlService } from '../services/CrawlService';
import { validateCepRange, generateCepRange, normalizeCep } from '../utils/cepUtils';
import logger from '../utils/logger';

const crawlService = new CrawlService();

export class CepController {
  /**
   * POST /cep/crawl
   * Inicia o processamento assíncrono de um intervalo de CEPs
   */
  async startCrawl(req: Request, res: Response): Promise<void> {
    try {
      const { cep_start, cep_end } = req.body;

      // Validações
      if (!cep_start || !cep_end) {
        res.status(400).json({
          error: 'Parâmetros obrigatórios: cep_start e cep_end',
        });
        return;
      }

      const validation = validateCepRange(cep_start, cep_end);
      if (!validation.valid) {
        res.status(400).json({
          error: validation.error,
        });
        return;
      }

      // Gerar crawl_id único
      const crawlId = uuidv4();

      // Normalizar CEPs
      const cepStartNormalized = normalizeCep(cep_start);
      const cepEndNormalized = normalizeCep(cep_end);

      // Gerar lista de CEPs
      const ceps = generateCepRange(cepStartNormalized, cepEndNormalized);

      logger.info({ crawlId, total: ceps.length }, 'Iniciando crawl');

      // Processar assincronamente (não aguardar)
      crawlService
        .startCrawl(crawlId, cepStartNormalized, cepEndNormalized, ceps)
        .catch((error) => {
          logger.error({ err: error, crawlId }, 'Erro ao processar crawl');
        });

      // Responder imediatamente com 202 Accepted
      res.status(202).json({
        crawl_id: crawlId,
        status: 'pending',
        total: ceps.length,
      });
    } catch (error) {
      logger.error({ err: error }, 'Erro em startCrawl');
      res.status(500).json({
        error: 'Erro interno ao iniciar crawl',
      });
    }
  }

  /**
   * GET /cep/crawl/:crawl_id
   * Consulta o status de um crawl
   */
  async getCrawlStatus(req: Request, res: Response): Promise<void> {
    try {
      const { crawl_id } = req.params;

      const crawl = await crawlService.getCrawlStatus(crawl_id);

      if (!crawl) {
        res.status(404).json({
          error: 'Crawl não encontrado',
        });
        return;
      }

      res.status(200).json({
        crawl_id: crawl._id,
        status: crawl.status,
        total: crawl.total,
        processed: crawl.processed,
        success: crawl.success,
        error: crawl.error,
        created_at: crawl.created_at,
        updated_at: crawl.updated_at,
      });
    } catch (error) {
      logger.error({ err: error }, 'Erro em getCrawlStatus');
      res.status(500).json({
        error: 'Erro interno ao consultar status',
      });
    }
  }

  /**
   * GET /cep/crawl/:crawl_id/results
   * Consulta os resultados de um crawl com paginação
   */
  async getCrawlResults(req: Request, res: Response): Promise<void> {
    try {
      const { crawl_id } = req.params;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      // Validar limites
      if (page < 1) {
        res.status(400).json({ error: 'Página deve ser maior que 0' });
        return;
      }

      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limit deve estar entre 1 e 100' });
        return;
      }

      const results = await crawlService.getCrawlResults(crawl_id, page, limit);

      if (!results) {
        res.status(404).json({
          error: 'Crawl não encontrado',
        });
        return;
      }

      const totalPages = Math.ceil(results.total / limit);

      res.status(200).json({
        crawl_id,
        page,
        limit,
        total: results.total,
        total_pages: totalPages,
        data: results.data,
      });
    } catch (error) {
      logger.error({ err: error }, 'Erro em getCrawlResults');
      res.status(500).json({
        error: 'Erro interno ao consultar resultados',
      });
    }
  }

  /**
   * GET /cep/dashboard/summary
   * Retorna estatísticas para dashboard em tempo real
   */
  async getDashboardSummary(_req: Request, res: Response): Promise<void> {
    try {
      const summary = await crawlService.getDashboardSummary();
      res.status(200).json(summary);
    } catch (error) {
      logger.error({ err: error }, 'Erro em getDashboardSummary');
      res.status(500).json({ error: 'Erro interno ao consultar dashboard' });
    }
  }
}
