import axios from 'axios';
import { ViaCepData } from '../models/CepResult';
import getRedisClient from '../config/redis';
import logger from '../utils/logger';

const VIACEP_BASE_URL = process.env.VIACEP_BASE_URL || 'https://viacep.com.br/ws';
const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_TTL_SECONDS || '86400', 10); // 24h
const CACHE_NULL_TTL_SECONDS = parseInt(process.env.REDIS_NULL_TTL_SECONDS || '600', 10); // 10m
const CACHE_PREFIX = 'viacep:';

export class ViaCepService {
  async consultarCep(cep: string): Promise<ViaCepData | null> {
    const cepFormatted = cep.replace(/\D/g, '');

    if (cepFormatted.length !== 8) {
      throw new Error(`CEP inválido: ${cep}`);
    }

    const redis = getRedisClient();
    const cacheKey = `${CACHE_PREFIX}${cepFormatted}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached !== null) {
          return cached === 'null' ? null : (JSON.parse(cached) as ViaCepData);
        }
      } catch (error) {
        logger.warn({ err: error, cacheKey }, 'Erro ao ler cache Redis');
      }
    }

    try {
      const url = `${VIACEP_BASE_URL}/${cepFormatted}/json/`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'CEP-Crawler/1.0',
        },
      });

      // ViaCEP retorna { erro: true } quando o CEP não existe
      if (response.data.erro === true) {
        if (redis) {
          await this.setCache(redis, cacheKey, null, CACHE_NULL_TTL_SECONDS);
        }
        return null;
      }

      const data = response.data as ViaCepData;

      if (redis) {
        await this.setCache(redis, cacheKey, data, CACHE_TTL_SECONDS);
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          if (redis) {
            await this.setCache(redis, cacheKey, null, CACHE_NULL_TTL_SECONDS);
          }
          return null;
        }
        throw new Error(`Erro ao consultar ViaCEP: ${error.message}`);
      }
      throw error;
    }
  }

  private async setCache(redis: ReturnType<typeof getRedisClient>, key: string, value: ViaCepData | null, ttl: number) {
    if (!redis) return;

    try {
      const payload = value === null ? 'null' : JSON.stringify(value);
      await redis.set(key, payload, 'EX', ttl);
    } catch (error) {
      logger.warn({ err: error, key }, 'Erro ao gravar cache Redis');
    }
  }
}
