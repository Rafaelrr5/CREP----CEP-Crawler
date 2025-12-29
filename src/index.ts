import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase, getDatabase } from './config/database';
import { getQueueUrl, getSQSClient } from './config/queue';
import cepRoutes from './routes/cepRoutes';
import logger from './utils/logger';

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'HTTP request received');
  next();
});

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: 'unknown' as 'unknown' | 'ok' | 'error',
    queue: 'unknown' as 'unknown' | 'ok' | 'error',
  };

  try {
    const db = getDatabase();
    await db.command({ ping: 1 });
    health.mongo = 'ok';
  } catch (error) {
    logger.error({ err: error }, 'Healthcheck MongoDB failed');
    health.mongo = 'error';
    health.status = 'error';
  }

  try {
    const queueUrl = getQueueUrl('primary');
    const sqs = getSQSClient();
    await sqs
      .getQueueAttributes({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] })
      .promise();
    health.queue = 'ok';
  } catch (error) {
    logger.error({ err: error }, 'Healthcheck queue failed');
    health.queue = 'error';
    health.status = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Rotas
app.use('/cep', cepRoutes);
app.use('/', cepRoutes);

// Rota 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Rota não encontrada',
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Erro não tratado');
  res.status(500).json({
    error: 'Erro interno do servidor',
  });
});

// Inicializar servidor
const startServer = async () => {
  try {
    // Conectar ao MongoDB
    await connectToDatabase();

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'API rodando');
      logger.info({ url: `http://localhost:${PORT}/health` }, 'Health check endpoint');
      logger.info('Endpoints disponíveis: POST /cep/crawl, GET /cep/crawl/:crawl_id, GET /cep/crawl/:crawl_id/results');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Erro ao iniciar servidor');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM, encerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Recebido SIGINT, encerrando...');
  process.exit(0);
});

startServer();

export default app;
