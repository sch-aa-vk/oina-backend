import { AppError } from '../../src/utils/errors';
import { validateCreateGamePayload } from '../../src/utils/game-validators';

const basePayload = {
  type: 'choose-me' as const,
  title: 'My Game',
  content: {},
};

describe('reward validation', () => {
  // ── text rewards ────────────────────────────────────────────────────────────

  describe('text rewards', () => {
    it('accepts valid text reward', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 100, label: 'Great!', type: 'text', text: 'Well done!' }],
          },
        })
      ).not.toThrow();
    });

    it('rejects text reward missing text field', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 100, label: 'Great!', type: 'text' }],
          },
        })
      ).toThrow(AppError);
    });

    it('rejects text reward with text over 2000 chars', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 100, label: 'Great!', type: 'text', text: 'x'.repeat(2001) }],
          },
        })
      ).toThrow(AppError);
    });

    it('throws INVALID_REWARD_PAYLOAD for missing text field', () => {
      try {
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 100, label: 'Great!', type: 'text' }],
          },
        });
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('INVALID_REWARD_PAYLOAD');
      }
    });
  });

  // ── media reward type stored without assetKey rejection ─────────────────────

  describe('media reward types', () => {
    it('accepts image reward without assetKey', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 200, label: 'Star!', type: 'image' }],
          },
        })
      ).not.toThrow();
    });

    it('accepts video reward without assetKey', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 300, label: 'Winner!', type: 'video' }],
          },
        })
      ).not.toThrow();
    });

    it('accepts audio reward without assetKey', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 300, label: 'Winner!', type: 'audio' }],
          },
        })
      ).not.toThrow();
    });

    it('rejects reward with client-supplied assetKey', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 200, label: 'Star!', type: 'image', assetKey: 'some/key.png' }],
          },
        })
      ).toThrow(AppError);
    });

    it('throws INVALID_REWARD_PAYLOAD for client-supplied assetKey', () => {
      try {
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 200, label: 'Star!', type: 'image', assetKey: 'some/key.png' }],
          },
        });
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('INVALID_REWARD_PAYLOAD');
      }
    });
  });

  // ── max 5 rewards ─────────────────────────────────────────────────────────

  describe('reward count limit', () => {
    const makeReward = (i: number) => ({ id: `r${i}`, pointsThreshold: i * 10, label: `Reward ${i}`, type: 'text' as const, text: 'msg' });

    it('accepts exactly 5 rewards', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: { rewards: [1, 2, 3, 4, 5].map(makeReward) },
        })
      ).not.toThrow();
    });

    it('rejects 6 rewards', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: { rewards: [1, 2, 3, 4, 5, 6].map(makeReward) },
        })
      ).toThrow(AppError);
    });

    it('throws INVALID_REWARD_PAYLOAD for 6 rewards', () => {
      try {
        validateCreateGamePayload({
          ...basePayload,
          content: { rewards: [1, 2, 3, 4, 5, 6].map(makeReward) },
        });
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('INVALID_REWARD_PAYLOAD');
      }
    });
  });

  // ── pointsThreshold range ─────────────────────────────────────────────────

  describe('pointsThreshold range', () => {
    it('accepts 0 as threshold', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 0, label: 'Start!', type: 'text', text: 'Begin!' }],
          },
        })
      ).not.toThrow();
    });

    it('accepts 100000 as threshold', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 100000, label: 'Max!', type: 'text', text: 'Max score!' }],
          },
        })
      ).not.toThrow();
    });

    it('rejects negative threshold', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: -1, label: 'Neg!', type: 'text', text: 'Negative' }],
          },
        })
      ).toThrow(AppError);
    });

    it('rejects threshold over 100000', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: {
            rewards: [{ id: 'r1', pointsThreshold: 100001, label: 'Over!', type: 'text', text: 'Over max' }],
          },
        })
      ).toThrow(AppError);
    });
  });

  // ── scoring config ────────────────────────────────────────────────────────

  describe('scoring config', () => {
    it('accepts valid scoring config', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: { scoring: { enabled: true, maxScore: 1000 } },
        })
      ).not.toThrow();
    });

    it('accepts scoring without optional maxScore', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: { scoring: { enabled: false } },
        })
      ).not.toThrow();
    });

    it('rejects scoring with non-boolean enabled', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: { scoring: { enabled: 'yes' as unknown as boolean } },
        })
      ).toThrow(AppError);
    });

    it('rejects scoring with negative maxScore', () => {
      expect(() =>
        validateCreateGamePayload({
          ...basePayload,
          content: { scoring: { enabled: true, maxScore: -5 } },
        })
      ).toThrow(AppError);
    });

    it('throws INVALID_REWARD_PAYLOAD for invalid scoring', () => {
      try {
        validateCreateGamePayload({
          ...basePayload,
          content: { scoring: { enabled: 'bad' as unknown as boolean } },
        });
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('INVALID_REWARD_PAYLOAD');
      }
    });
  });
});
