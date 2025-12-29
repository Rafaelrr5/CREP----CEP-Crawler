import { MongoClient, Db } from 'mongodb';
import logger from '../utils/logger';

let db: Db | null = null;

export const connectToDatabase = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cep_crawler';

  try {
    const client = await MongoClient.connect(mongoUri);
    db = client.db();

    logger.info('Conectado ao MongoDB com sucesso');

    // Criar índices
    await createIndexes(db);

    return db;
  } catch (error) {
    logger.error({ err: error }, 'Erro ao conectar ao MongoDB');
    throw error;
  }
};

const createIndexes = async (database: Db) => {
  try {
    // Índices para a collection crawls
    await database.collection('crawls').createIndexes([
      { key: { status: 1 } },
      { key: { created_at: -1 } },
    ]);

    // Índices para a collection cep_results
    await database.collection('cep_results').createIndexes([
      { key: { crawl_id: 1 } },
      { key: { cep: 1 } },
      { key: { status: 1 } },
      { key: { crawl_id: 1, status: 1 } },
    ]);

    logger.info('Índices criados com sucesso');
  } catch (error) {
    logger.warn({ err: error }, 'Erro ao criar índices');
  }
};

export const getDatabase = (): Db => {
  if (!db) {
    throw new Error('Database não inicializado. Execute connectToDatabase() primeiro.');
  }
  return db;
};
