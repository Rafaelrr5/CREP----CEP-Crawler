import { isValidCepFormat, normalizeCep, generateCepRange, validateCepRange } from './cepUtils';

describe('cepUtils', () => {
  describe('isValidCepFormat', () => {
    it('should return true for valid CEP format', () => {
      expect(isValidCepFormat('12345678')).toBe(true);
      expect(isValidCepFormat('12345-678')).toBe(true);
    });

    it('should return false for invalid CEP format', () => {
      expect(isValidCepFormat('1234567')).toBe(false);
      expect(isValidCepFormat('123456789')).toBe(false);
      expect(isValidCepFormat('abcdefgh')).toBe(false);
    });
  });

  describe('normalizeCep', () => {
    it('should remove non-numeric characters', () => {
      expect(normalizeCep('12345-678')).toBe('12345678');
      expect(normalizeCep('12.345-678')).toBe('12345678');
    });

    it('should pad with zeros if length is less than 8', () => {
      expect(normalizeCep('123')).toBe('00000123');
    });
  });

  describe('generateCepRange', () => {
    it('should generate a range of CEPs', () => {
      const range = generateCepRange('00000001', '00000003');
      expect(range).toEqual(['00000001', '00000002', '00000003']);
    });

    it('should throw error if start is greater than end', () => {
      expect(() => generateCepRange('00000002', '00000001')).toThrow('CEP inicial deve ser menor ou igual ao CEP final');
    });
  });

  describe('validateCepRange', () => {
    it('should return valid for correct range', () => {
      expect(validateCepRange('00000001', '00000003')).toEqual({ valid: true });
    });

    it('should return error for invalid start CEP', () => {
      expect(validateCepRange('invalid', '00000003')).toEqual({ valid: false, error: 'CEP inicial inválido' });
    });

    it('should return error for invalid end CEP', () => {
      expect(validateCepRange('00000001', 'invalid')).toEqual({ valid: false, error: 'CEP final inválido' });
    });

    it('should return error if start is greater than end', () => {
      expect(validateCepRange('00000002', '00000001')).toEqual({ valid: false, error: 'CEP inicial deve ser menor ou igual ao CEP final' });
    });

    it('should return error if range is too large', () => {
      // 10001 CEPs (excede o limite de 10.000)
      expect(validateCepRange('00000000', '00010000')).toEqual({ valid: false, error: 'Range muito grande. Máximo de 10.000 CEPs por requisição' });
    });
  });
});
