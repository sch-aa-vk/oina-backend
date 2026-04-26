import { AppError } from '../../src/utils/errors';
import { validateGenerateGiftPayload } from '../../src/utils/gift-validators';

const validPayload = {
  recipientName: 'Alice',
  occasion: 'Birthday',
  personalMessage: 'Happy birthday!',
  tone: 'warm',
  themeName: 'Floral',
  themeDirection: 'Soft and romantic',
  templateLabel: 'Classic',
  templateBlueprint: 'A classic layout',
  variationLabel: 'Pastel',
  variationBlueprint: 'Pastel color scheme',
  variationDescription: 'Soft pastel tones throughout',
};

describe('validateGenerateGiftPayload', () => {
  it('accepts a valid payload', () => {
    expect(() => validateGenerateGiftPayload(validPayload)).not.toThrow();
  });

  it('rejects missing recipientName', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, recipientName: undefined as never })).toThrow(AppError);
  });

  it('rejects empty recipientName', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, recipientName: '' })).toThrow(AppError);
  });

  it('rejects recipientName over 80 chars', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, recipientName: 'a'.repeat(81) })).toThrow(AppError);
  });

  it('accepts recipientName at exactly 80 chars', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, recipientName: 'a'.repeat(80) })).not.toThrow();
  });

  it('rejects missing personalMessage', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, personalMessage: undefined as never })).toThrow(AppError);
  });

  it('rejects empty personalMessage', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, personalMessage: '' })).toThrow(AppError);
  });

  it('rejects personalMessage over 2000 chars', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, personalMessage: 'x'.repeat(2001) })).toThrow(AppError);
  });

  it('accepts personalMessage at exactly 2000 chars', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, personalMessage: 'x'.repeat(2000) })).not.toThrow();
  });

  it('rejects missing occasion', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, occasion: undefined as never })).toThrow(AppError);
  });

  it('rejects empty occasion', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, occasion: '   ' })).toThrow(AppError);
  });

  it('rejects missing tone', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, tone: undefined as never })).toThrow(AppError);
  });

  it('rejects missing themeName', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, themeName: undefined as never })).toThrow(AppError);
  });

  it('rejects missing themeDirection', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, themeDirection: undefined as never })).toThrow(AppError);
  });

  it('rejects missing templateLabel', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, templateLabel: undefined as never })).toThrow(AppError);
  });

  it('rejects missing templateBlueprint', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, templateBlueprint: undefined as never })).toThrow(AppError);
  });

  it('rejects missing variationLabel', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, variationLabel: undefined as never })).toThrow(AppError);
  });

  it('rejects missing variationBlueprint', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, variationBlueprint: undefined as never })).toThrow(AppError);
  });

  it('rejects missing variationDescription', () => {
    expect(() => validateGenerateGiftPayload({ ...validPayload, variationDescription: undefined as never })).toThrow(AppError);
  });

  it('throws INVALID_GIFT_PAYLOAD error code', () => {
    try {
      validateGenerateGiftPayload({ ...validPayload, recipientName: '' });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).errorCode).toBe('INVALID_GIFT_PAYLOAD');
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it('collects multiple errors at once', () => {
    try {
      validateGenerateGiftPayload({ recipientName: '', personalMessage: '' });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.details).toHaveProperty('recipientName');
      expect(appErr.details).toHaveProperty('personalMessage');
    }
  });
});
