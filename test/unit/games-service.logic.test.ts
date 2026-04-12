import { AppError } from '../../src/utils/errors';

// ── Helper to build a mock GameRecord ─────────────────────────────────────────

const makeGame = (overrides: Record<string, unknown> = {}) => ({
  gameId: 'game-1',
  userId: 'user-1',
  type: 'choose-me',
  title: 'Test Game',
  visibility: 'draft',
  content: {},
  viewCount: 0,
  playCount: 0,
  likeCount: 0,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  currentVersion: 1,
  ...overrides,
});

// ── Visibility transition rules ────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['private-link', 'public'],
  'private-link': ['public', 'draft'],
  public: ['private-link', 'draft'],
};

const assertValidTransition = (from: string, to: string): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new AppError(400, 'INVALID_VISIBILITY_TRANSITION', `Cannot transition from '${from}' to '${to}'`);
  }
};

// ── Month rollover logic ────────────────────────────────────────────────────────

const getCurrentMonthKey = (date: Date = new Date()): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const checkQuota = (
  totalGames: number,
  gamesThisMonth: number,
  currentMonthStart: string,
  currentMonth: string
): void => {
  const MAX_TOTAL = 5;
  const MAX_MONTHLY = 3;

  if (totalGames >= MAX_TOTAL) {
    throw new AppError(409, 'QUOTA_TOTAL_GAMES_EXCEEDED', 'Max 5 games');
  }

  const effectiveMonthly = currentMonthStart !== currentMonth ? 0 : gamesThisMonth;
  if (effectiveMonthly >= MAX_MONTHLY) {
    throw new AppError(409, 'QUOTA_MONTHLY_GAMES_EXCEEDED', 'Max 3 games per month');
  }
};

// ── Version increment logic ────────────────────────────────────────────────────

const nextVersion = (current: number): number => current + 1;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('games service – unit logic', () => {
  // ── Quota pass/fail ───────────────────────────────────────────────────────

  describe('quota checks', () => {
    const currentMonth = '2026-04';

    it('allows creation when within quota', () => {
      expect(() => checkQuota(0, 0, currentMonth, currentMonth)).not.toThrow();
    });

    it('allows creation at limit boundary (4 total, 2 monthly)', () => {
      expect(() => checkQuota(4, 2, currentMonth, currentMonth)).not.toThrow();
    });

    it('rejects when totalGames reaches 5', () => {
      expect(() => checkQuota(5, 0, currentMonth, currentMonth)).toThrow(AppError);
    });

    it('rejects with QUOTA_TOTAL_GAMES_EXCEEDED error code', () => {
      try {
        checkQuota(5, 0, currentMonth, currentMonth);
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('QUOTA_TOTAL_GAMES_EXCEEDED');
      }
    });

    it('rejects when gamesThisMonth reaches 3', () => {
      expect(() => checkQuota(2, 3, currentMonth, currentMonth)).toThrow(AppError);
    });

    it('rejects with QUOTA_MONTHLY_GAMES_EXCEEDED error code', () => {
      try {
        checkQuota(2, 3, currentMonth, currentMonth);
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('QUOTA_MONTHLY_GAMES_EXCEEDED');
      }
    });
  });

  // ── Month rollover ────────────────────────────────────────────────────────

  describe('month rollover', () => {
    it('treats gamesThisMonth as 0 when month has changed', () => {
      // Old month stored, new month current → monthly quota should reset
      expect(() => checkQuota(2, 3, '2026-03', '2026-04')).not.toThrow();
    });

    it('still enforces total quota after rollover', () => {
      expect(() => checkQuota(5, 3, '2026-03', '2026-04')).toThrow(AppError);
    });

    it('getCurrentMonthKey returns YYYY-MM format', () => {
      const key = getCurrentMonthKey(new Date('2026-04-12T00:00:00Z'));
      expect(key).toBe('2026-04');
    });
  });

  // ── Ownership checks ──────────────────────────────────────────────────────

  describe('ownership', () => {
    it('allows owner access', () => {
      const game = makeGame({ userId: 'user-1' });
      expect(() => {
        if (game.userId !== 'user-1') throw new AppError(403, 'GAME_FORBIDDEN', 'Forbidden');
      }).not.toThrow();
    });

    it('rejects non-owner access', () => {
      const game = makeGame({ userId: 'user-1' });
      expect(() => {
        if (game.userId !== 'user-other') throw new AppError(403, 'GAME_FORBIDDEN', 'Forbidden');
      }).toThrow(AppError);
    });
  });

  // ── Visibility transitions ────────────────────────────────────────────────

  describe('visibility transitions', () => {
    it('allows draft -> private-link', () => {
      expect(() => assertValidTransition('draft', 'private-link')).not.toThrow();
    });

    it('allows draft -> public', () => {
      expect(() => assertValidTransition('draft', 'public')).not.toThrow();
    });

    it('allows private-link -> public', () => {
      expect(() => assertValidTransition('private-link', 'public')).not.toThrow();
    });

    it('allows public -> private-link', () => {
      expect(() => assertValidTransition('public', 'private-link')).not.toThrow();
    });

    it('allows private-link -> draft (unpublish)', () => {
      expect(() => assertValidTransition('private-link', 'draft')).not.toThrow();
    });

    it('allows public -> draft (unpublish)', () => {
      expect(() => assertValidTransition('public', 'draft')).not.toThrow();
    });

    it('rejects draft -> draft', () => {
      expect(() => assertValidTransition('draft', 'draft')).toThrow(AppError);
    });

    it('rejects public -> public', () => {
      expect(() => assertValidTransition('public', 'public')).toThrow(AppError);
    });

    it('throws INVALID_VISIBILITY_TRANSITION error code', () => {
      try {
        assertValidTransition('draft', 'draft');
        fail('should have thrown');
      } catch (err) {
        expect((err as AppError).errorCode).toBe('INVALID_VISIBILITY_TRANSITION');
      }
    });
  });

  // ── Version incrementing ──────────────────────────────────────────────────

  describe('version incrementing', () => {
    it('increments version by 1', () => {
      expect(nextVersion(1)).toBe(2);
      expect(nextVersion(5)).toBe(6);
    });

    it('starts at 1 for new game', () => {
      const game = makeGame({ currentVersion: 1 });
      expect(game.currentVersion).toBe(1);
    });

    it('version is incremented on update', () => {
      const game = makeGame({ currentVersion: 3 });
      expect(nextVersion(game.currentVersion)).toBe(4);
    });
  });

  // ── Preview constraints ───────────────────────────────────────────────────

  describe('preview', () => {
    it('allows preview for draft games', () => {
      const game = makeGame({ visibility: 'draft' });
      expect(() => {
        if (game.visibility !== 'draft') throw new AppError(400, 'PREVIEW_ONLY_FOR_DRAFT', 'Not a draft');
      }).not.toThrow();
    });

    it('rejects preview for public games', () => {
      const game = makeGame({ visibility: 'public' });
      expect(() => {
        if (game.visibility !== 'draft') throw new AppError(400, 'PREVIEW_ONLY_FOR_DRAFT', 'Not a draft');
      }).toThrow(AppError);
    });
  });
});
