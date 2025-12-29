/**
 * Valida se uma string está no formato de CEP (8 dígitos numéricos)
 */
export const isValidCepFormat = (cep: string): boolean => {
  const cepClean = cep.replace(/\D/g, '');
  return cepClean.length === 8 && /^\d+$/.test(cepClean);
};

/**
 * Normaliza um CEP removendo caracteres não numéricos
 */
export const normalizeCep = (cep: string): string => {
  return cep.replace(/\D/g, '').padStart(8, '0');
};

/**
 * Gera todos os CEPs em um intervalo
 */
export const generateCepRange = (cepStart: string, cepEnd: string): string[] => {
  const start = parseInt(normalizeCep(cepStart), 10);
  const end = parseInt(normalizeCep(cepEnd), 10);

  if (start > end) {
    throw new Error('CEP inicial deve ser menor ou igual ao CEP final');
  }

  const range: string[] = [];
  for (let i = start; i <= end; i++) {
    range.push(i.toString().padStart(8, '0'));
  }

  return range;
};

/**
 * Valida se o range de CEPs é válido
 */
export const validateCepRange = (cepStart: string, cepEnd: string): { valid: boolean; error?: string } => {
  if (!isValidCepFormat(cepStart)) {
    return { valid: false, error: 'CEP inicial inválido' };
  }

  if (!isValidCepFormat(cepEnd)) {
    return { valid: false, error: 'CEP final inválido' };
  }

  const start = parseInt(normalizeCep(cepStart), 10);
  const end = parseInt(normalizeCep(cepEnd), 10);

  if (start > end) {
    return { valid: false, error: 'CEP inicial deve ser menor ou igual ao CEP final' };
  }

  const totalCeps = end - start + 1;
  if (totalCeps > 100000) {
    return { valid: false, error: 'Range muito grande. Máximo de 100.000 CEPs por requisição' };
  }

  return { valid: true };
};
