import axios from 'axios';
import { ViaCepService } from './ViaCepService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ViaCepService', () => {
  let service: ViaCepService;

  beforeEach(() => {
    service = new ViaCepService();
    jest.clearAllMocks();
  });

  it('should return data for a valid CEP', async () => {
    const mockData = {
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      complemento: 'lado ímpar',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
      ibge: '3550308',
      gia: '1004',
      ddd: '11',
      siafi: '7107',
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockData });

    const result = await service.consultarCep('01001000');
    expect(result).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/01001000/json/'), expect.any(Object));
  });

  it('should return null if CEP does not exist (erro: true)', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { erro: true } });

    const result = await service.consultarCep('99999999');
    expect(result).toBeNull();
  });

  it('should throw error for invalid CEP format', async () => {
    await expect(service.consultarCep('123')).rejects.toThrow('CEP inválido: 123');
  });

  it('should handle network errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(service.consultarCep('01001000')).rejects.toThrow('Erro ao consultar ViaCEP: Network Error');
  });
});
