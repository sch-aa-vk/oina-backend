import { Errors } from './errors';
import { GenerateGiftPayload } from '../types/gift.types';

export const validateGenerateGiftPayload = (body: Partial<GenerateGiftPayload>): void => {
  const errors: Record<string, string> = {};

  if (!body.recipientName || typeof body.recipientName !== 'string' || body.recipientName.length < 1 || body.recipientName.length > 80) {
    errors.recipientName = 'recipientName is required and must be between 1 and 80 characters';
  }

  if (!body.personalMessage || typeof body.personalMessage !== 'string' || body.personalMessage.length < 1 || body.personalMessage.length > 2000) {
    errors.personalMessage = 'personalMessage is required and must be between 1 and 2000 characters';
  }

  const requiredStrings: (keyof GenerateGiftPayload)[] = [
    'occasion',
    'tone',
    'themeName',
    'themeDirection',
    'templateLabel',
    'templateBlueprint',
    'variationLabel',
    'variationBlueprint',
    'variationDescription',
  ];

  for (const field of requiredStrings) {
    if (!body[field] || typeof body[field] !== 'string' || (body[field] as string).trim().length === 0) {
      errors[field] = `${field} is required`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.INVALID_GIFT_PAYLOAD(errors);
  }
};
