export type CrawlStatus = 'pending' | 'running' | 'finished' | 'failed';

export interface Crawl {
  _id: string;
  cep_start: string;
  cep_end: string;
  status: CrawlStatus;
  total: number;
  processed: number;
  success: number;
  error: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCrawlInput {
  _id: string;
  cep_start: string;
  cep_end: string;
  total: number;
}
