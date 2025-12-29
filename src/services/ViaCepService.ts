import axios from 'axios';
import { ViaCepData } from '../models/CepResult';

const VIACEP_BASE_URL = process.env.VIACEP_BASE_URL || 'https://viacep.com.br/ws';

export class ViaCepService {
  async consultarCep(cep: string): Promise<ViaCepData | null> {
    const cepFormatted = cep.replace(/\D/g, '');

    if (cepFormatted.length !== 8) {
      throw new Error(`CEP inválido: ${cep}`);
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
        return null;
      }

      return response.data as ViaCepData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        throw new Error(`Erro ao consultar ViaCEP: ${error.message}`);
      }
      throw error;
    }
  }
}
