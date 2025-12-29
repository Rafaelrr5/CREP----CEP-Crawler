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

  async checkIfFinished(crawlId: string): Promise<boolean> {
    const crawl = await this.findById(crawlId);
    if (!crawl) return false;

    if (crawl.processed >= crawl.total) {
      await this.updateStatus(crawlId, 'finished');
      return true;
    }

    return false;
  }

  async setRunning(crawlId: string): Promise<void> {
    await this.updateStatus(crawlId, 'running');
  }
}
