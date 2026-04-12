import { GameResponse } from '../../types/game.types';
import { Errors } from '../../utils/errors';
import { getGameOrThrow, assertOwner, toGameResponse } from './_helpers';

export const previewGame = async (userId: string, gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  if (game.visibility !== 'draft') throw Errors.PREVIEW_ONLY_FOR_DRAFT();
  return toGameResponse(game);
};
