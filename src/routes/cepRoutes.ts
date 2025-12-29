import { Router } from 'express';
import { CepController } from '../controllers/CepController';

const router = Router();
const cepController = new CepController();

/**
 * POST /cep/crawl
 * Inicia o processamento de um intervalo de CEPs
 */
router.post('/crawl', (req, res) => cepController.startCrawl(req, res));

/**
 * GET /cep/crawl/:crawl_id
 * Consulta o status de um crawl
 */
router.get('/crawl/:crawl_id', (req, res) => cepController.getCrawlStatus(req, res));

/**
 * GET /cep/crawl/:crawl_id/results
 * Consulta os resultados de um crawl com paginação
 */
router.get('/crawl/:crawl_id/results', (req, res) => cepController.getCrawlResults(req, res));

export default router;
