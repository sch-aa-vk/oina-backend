import { Errors } from './errors';
import { CreateGamePayload, UpdateGamePayload, PublishGamePayload, GameContent, Reward, ScoringConfig } from '../types/game.types';

const MAX_CONTENT_BYTES = 100 * 1024;
const VALID_TYPES = ['choose-me', 'guess-by-emoji', 'crossword'];
const VALID_REWARD_TYPES = ['text', 'image', 'video', 'audio'];
const MAX_REWARDS = 5;

const validateScoringConfig = (scoring: unknown): void => {
  if (typeof scoring !== 'object' || scoring === null || Array.isArray(scoring)) {
    throw Errors.INVALID_REWARD_PAYLOAD({ scoring: 'Must be an object' });
  }
  const s = scoring as Record<string, unknown>;
  if (typeof s.enabled !== 'boolean') {
    throw Errors.INVALID_REWARD_PAYLOAD({ 'scoring.enabled': 'Must be a boolean' });
  }
  if (s.maxScore !== undefined && (typeof s.maxScore !== 'number' || s.maxScore < 0)) {
    throw Errors.INVALID_REWARD_PAYLOAD({ 'scoring.maxScore': 'Must be a non-negative number' });
  }
};

const validateRewards = (rewards: unknown): void => {
  if (!Array.isArray(rewards)) {
    throw Errors.INVALID_REWARD_PAYLOAD({ rewards: 'Must be an array' });
  }
  if (rewards.length > MAX_REWARDS) {
    throw Errors.INVALID_REWARD_PAYLOAD({ rewards: `Maximum ${MAX_REWARDS} rewards allowed` });
  }
  rewards.forEach((item: unknown, index: number) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}]`]: 'Must be an object' });
    }
    const r = item as Record<string, unknown>;

    if (!r.id || typeof r.id !== 'string') {
      throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].id`]: 'id is required and must be a string' });
    }

    if (typeof r.pointsThreshold !== 'number' || r.pointsThreshold < 0 || r.pointsThreshold > 100000) {
      throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].pointsThreshold`]: 'Must be a number between 0 and 100000' });
    }

    if (!r.label || typeof r.label !== 'string' || r.label.length < 1 || r.label.length > 80) {
      throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].label`]: 'label must be between 1 and 80 characters' });
    }

    if (!r.type || !VALID_REWARD_TYPES.includes(r.type as string)) {
      throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].type`]: `Must be one of: ${VALID_REWARD_TYPES.join(', ')}` });
    }

    if (r.type === 'text') {
      if (!r.text || typeof r.text !== 'string') {
        throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].text`]: 'text is required for text rewards' });
      }
      if ((r.text as string).length > 2000) {
        throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].text`]: 'text must be at most 2000 characters' });
      }
    }

    if (r.assetKey !== undefined) {
      throw Errors.INVALID_REWARD_PAYLOAD({ [`rewards[${index}].assetKey`]: 'assetKey is managed by the server and cannot be set by the client' });
    }
  });
};

const validateContentExtras = (content: GameContent): void => {
  if (content.scoring !== undefined) {
    validateScoringConfig(content.scoring as ScoringConfig);
  }
  if (content.rewards !== undefined) {
    validateRewards(content.rewards as Reward[]);
  }
};

export const validateCreateGamePayload = (payload: Partial<CreateGamePayload>): void => {
  const errors: Record<string, string> = {};

  if (!payload.type || !VALID_TYPES.includes(payload.type)) {
    errors.type = `Must be one of: ${VALID_TYPES.join(', ')}`;
  }

  if (!payload.title || payload.title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (payload.title.trim().length > 120) {
    errors.title = 'Title must be at most 120 characters';
  }

  if (payload.description !== undefined && payload.description.length > 1000) {
    errors.description = 'Description must be at most 1000 characters';
  }

  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags) || payload.tags.length > 10) {
      errors.tags = 'Tags must be an array of at most 10 items';
    } else {
      const invalidTag = payload.tags.find((t) => typeof t !== 'string' || t.length < 1 || t.length > 30);
      if (invalidTag !== undefined) {
        errors.tags = 'Each tag must be between 1 and 30 characters';
      }
    }
  }

  if (payload.content === undefined || payload.content === null) {
    errors.content = 'Content is required';
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.INVALID_GAME_PAYLOAD(errors);
  }

  if (payload.content !== undefined) {
    const serialized = JSON.stringify(payload.content);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) {
      throw Errors.CONTENT_TOO_LARGE();
    }
    validateContentExtras(payload.content as GameContent);
  }
};

export const validateUpdateGamePayload = (payload: Partial<UpdateGamePayload>): void => {
  const errors: Record<string, string> = {};

  if (payload.title !== undefined) {
    if (payload.title.trim().length === 0) {
      errors.title = 'Title cannot be empty';
    } else if (payload.title.trim().length > 120) {
      errors.title = 'Title must be at most 120 characters';
    }
  }

  if (payload.description !== undefined && payload.description.length > 1000) {
    errors.description = 'Description must be at most 1000 characters';
  }

  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags) || payload.tags.length > 10) {
      errors.tags = 'Tags must be an array of at most 10 items';
    } else {
      const invalidTag = payload.tags.find((t) => typeof t !== 'string' || t.length < 1 || t.length > 30);
      if (invalidTag !== undefined) {
        errors.tags = 'Each tag must be between 1 and 30 characters';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.INVALID_GAME_PAYLOAD(errors);
  }

  if (payload.content !== undefined) {
    const serialized = JSON.stringify(payload.content);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) {
      throw Errors.CONTENT_TOO_LARGE();
    }
    validateContentExtras(payload.content as GameContent);
  }
};

export const validatePublishGamePayload = (payload: Partial<PublishGamePayload>): void => {
  const validVisibility = ['private-link', 'public'];
  if (!payload.visibility || !validVisibility.includes(payload.visibility)) {
    throw Errors.INVALID_GAME_PAYLOAD({ visibility: `Must be one of: ${validVisibility.join(', ')}` });
  }
};
