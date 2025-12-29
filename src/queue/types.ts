export interface CepMessage {
  crawl_id: string;
  cep: string;
}

export const createCepMessage = (crawlId: string, cep: string): CepMessage => {
  return {
    crawl_id: crawlId,
    cep,
  };
};

export const parseCepMessage = (messageBody: string): CepMessage => {
  try {
    return JSON.parse(messageBody);
  } catch (error) {
    throw new Error(`Mensagem inválida: ${messageBody}`);
  }
};
