import { GameResponse } from '../../types/game.types';
import { getGameOrThrow, toGameResponse } from './_helpers';
import { Errors } from '../../utils/errors';

export const getUserGame = async (gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);

  if (game.visibility === 'draft') {
    throw Errors.GAME_FORBIDDEN();
  }

  return toGameResponse(game);
};
