import axios from 'axios';
import { Crawl } from '../models/Crawl';
import logger from '../utils/logger';

const webhookUrls = (process.env.WEBHOOK_URLS || process.env.WEBHOOK_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export class WebhookService {
  async notifyCrawlFinished(crawl: Crawl): Promise<void> {
    if (webhookUrls.length === 0) {
      return;
    }

    const payload = {
      event: 'crawl.finished',
      crawl_id: crawl._id,
      status: crawl.status,
      total: crawl.total,
      processed: crawl.processed,
      success: crawl.success,
      error: crawl.error,
      started_at: crawl.created_at,
      finished_at: new Date(),
    };

    await Promise.all(
      webhookUrls.map(async (url) => {
        try {
          await axios.post(url, payload, { timeout: 5000 });
          logger.info({ url, crawlId: crawl._id }, 'Webhook enviado');
        } catch (error) {
          logger.warn({ err: error, url, crawlId: crawl._id }, 'Falha ao enviar webhook');
        }
      })
    );
  }
}

export default WebhookService;
