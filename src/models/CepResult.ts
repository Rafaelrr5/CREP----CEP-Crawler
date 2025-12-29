export type CepResultStatus = 'success' | 'error';

export interface ViaCepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface CepResult {
  _id?: string;
  crawl_id: string;
  cep: string;
  data: ViaCepData | null;
  status: CepResultStatus;
  error_message: string | null;
  processed_at: Date;
}

export interface CreateCepResultInput {
  crawl_id: string;
  cep: string;
  data: ViaCepData | null;
  status: CepResultStatus;
  error_message: string | null;
}
