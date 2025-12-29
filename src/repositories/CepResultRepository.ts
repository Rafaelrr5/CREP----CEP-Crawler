import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { CepResult, CreateCepResultInput } from '../models/CepResult';

export class CepResultRepository {
  private getCollection(): Collection<CepResult> {
    return getDatabase().collection<CepResult>('cep_results');
  }

  async create(input: CreateCepResultInput): Promise<CepResult> {
    const cepResult: CepResult = {
      ...input,
      processed_at: new Date(),
    };

    await this.getCollection().insertOne(cepResult as any);
    return cepResult;
  }

  async findByCrawlId(
    crawlId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: CepResult[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.getCollection()
        .find({ crawl_id: crawlId })
        .sort({ processed_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.getCollection().countDocuments({ crawl_id: crawlId }),
    ]);

    return { data, total };
  }

  async findByCep(crawlId: string, cep: string): Promise<CepResult | null> {
    return this.getCollection().findOne({ crawl_id: crawlId, cep });
  }

  async countByStatus(crawlId: string, status: 'success' | 'error'): Promise<number> {
    return this.getCollection().countDocuments({ crawl_id: crawlId, status });
  }
}
