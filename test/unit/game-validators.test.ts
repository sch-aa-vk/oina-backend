import { AppError } from '../../src/utils/errors';
import { validateCreateGamePayload, validateUpdateGamePayload, validatePublishGamePayload } from '../../src/utils/game-validators';

describe('game-validators', () => {
  // ── validateCreateGamePayload ───────────────────────────────────────────────

  describe('validateCreateGamePayload', () => {
    const validPayload = {
      type: 'choose-me' as const,
      title: 'My Game',
      content: { questions: [] },
    };

    it('accepts a valid payload', () => {
      expect(() => validateCreateGamePayload(validPayload)).not.toThrow();
    });

    it('rejects missing type', () => {
      expect(() => validateCreateGamePayload({ ...validPayload, type: undefined as never })).toThrow(AppError);
    });

    it('rejects invalid type', () => {
      expect(() => validateCreateGamePayload({ ...validPayload, type: 'unknown' as never })).toThrow(AppError);
    });

    it('rejects missing title', () => {
      expect(() => validateCreateGamePayload({ ...validPayload, title: '' })).toThrow(AppError);
    });

    it('rejects title over 120 chars', () => {
      expect(() => validateCreateGamePayload({ ...validPayload, title: 'a'.repeat(121) })).toThrow(AppError);
    });

    it('rejects description over 1000 chars', () => {
      expect(() =>
        validateCreateGamePayload({ ...validPayload, description: 'x'.repeat(1001) })
      ).toThrow(AppError);
    });

    it('rejects tags array over 10 items', () => {
      expect(() =>
        validateCreateGamePayload({ ...validPayload, tags: Array(11).fill('t') })
      ).toThrow(AppError);
    });

    it('rejects a tag over 30 chars', () => {
      expect(() =>
        validateCreateGamePayload({ ...validPayload, tags: ['a'.repeat(31)] })
      ).toThrow(AppError);
    });

    it('rejects missing content', () => {
      expect(() => validateCreateGamePayload({ ...validPayload, content: undefined as never })).toThrow(AppError);
    });

    it('rejects content over 100KB', () => {
      const bigContent = { data: 'x'.repeat(101 * 1024) };
      expect(() => validateCreateGamePayload({ ...validPayload, content: bigContent })).toThrow(AppError);
    });

    it('throws CONTENT_TOO_LARGE error code for oversized content', () => {
      const bigContent = { data: 'x'.repeat(101 * 1024) };
      try {
        validateCreateGamePayload({ ...validPayload, content: bigContent });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).errorCode).toBe('CONTENT_TOO_LARGE');
      }
    });
  });

  // ── validateUpdateGamePayload ───────────────────────────────────────────────

  describe('validateUpdateGamePayload', () => {
    it('accepts empty update (no-op)', () => {
      expect(() => validateUpdateGamePayload({})).not.toThrow();
    });

    it('rejects empty title string', () => {
      expect(() => validateUpdateGamePayload({ title: '   ' })).toThrow(AppError);
    });

    it('rejects title over 120 chars', () => {
      expect(() => validateUpdateGamePayload({ title: 'a'.repeat(121) })).toThrow(AppError);
    });
  });

  // ── validatePublishGamePayload ──────────────────────────────────────────────

  describe('validatePublishGamePayload', () => {
    it('accepts private-link', () => {
      expect(() => validatePublishGamePayload({ visibility: 'private-link' })).not.toThrow();
    });

    it('accepts public', () => {
      expect(() => validatePublishGamePayload({ visibility: 'public' })).not.toThrow();
    });

    it('rejects draft as visibility', () => {
      expect(() => validatePublishGamePayload({ visibility: 'draft' as never })).toThrow(AppError);
    });

    it('rejects missing visibility', () => {
      expect(() => validatePublishGamePayload({})).toThrow(AppError);
    });
  });
});
