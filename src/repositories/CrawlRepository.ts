import { Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { Crawl, CreateCrawlInput, CrawlStatus } from '../models/Crawl';

export class CrawlRepository {
  private getCollection(): Collection<Crawl> {
    return getDatabase().collection<Crawl>('crawls');
  }

  async create(input: CreateCrawlInput): Promise<Crawl> {
    const crawl: Crawl = {
      ...input,
      status: 'pending',
      processed: 0,
      success: 0,
      error: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.getCollection().insertOne(crawl as any);
    return crawl;
  }

  async findById(crawlId: string): Promise<Crawl | null> {
    return this.getCollection().findOne({ _id: crawlId } as any);
  }

  async updateStatus(crawlId: string, status: CrawlStatus): Promise<void> {
    await this.getCollection().updateOne(
      { _id: crawlId } as any,
      {
        $set: {
          status,
          updated_at: new Date(),
        },
      }
    );
  }

  async incrementProcessed(crawlId: string, success: boolean): Promise<void> {
    const update = success
      ? { $inc: { processed: 1, success: 1 } }
      : { $inc: { processed: 1, error: 1 } };

    await this.getCollection().updateOne(
      { _id: crawlId } as any,
      {
        ...update,
        $set: { updated_at: new Date() },
      }
    );
  }

  async checkIfFinished(crawlId: string): Promise<Crawl | null> {
    const result = await this.getCollection().findOneAndUpdate(
      {
        _id: crawlId,
        status: { $ne: 'finished' },
        $expr: { $gte: ['$processed', '$total'] },
      } as any,
      {
        $set: { status: 'finished', updated_at: new Date() },
      },
      { returnDocument: 'after' }
    );

    const value = (result as any)?.value as Crawl | undefined;
    return value ?? null;
  }

  async setRunning(crawlId: string): Promise<void> {
    await this.updateStatus(crawlId, 'running');
  }

  async getSummary(limitRecent: number = 10): Promise<{
    totals: Record<string, number>;
    aggregate: { totalCrawls: number; totalProcessed: number; totalSuccess: number; totalErrors: number };
    recent: Crawl[];
  }> {
    const [byStatus, recent, totalCrawls] = await Promise.all([
      this.getCollection()
        .aggregate([
          { $group: { _id: '$status', count: { $sum: 1 }, processed: { $sum: '$processed' }, success: { $sum: '$success' }, error: { $sum: '$error' } } },
        ])
        .toArray(),
      this.getCollection().find().sort({ created_at: -1 }).limit(limitRecent).toArray(),
      this.getCollection().countDocuments(),
    ]);

    const totals: Record<string, number> = {};
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    byStatus.forEach((item) => {
      totals[item._id] = item.count;
      totalProcessed += item.processed || 0;
      totalSuccess += item.success || 0;
      totalErrors += item.error || 0;
    });

    return {
      totals,
      aggregate: {
        totalCrawls,
        totalProcessed,
        totalSuccess,
        totalErrors,
      },
      recent,
    };
  }
}
