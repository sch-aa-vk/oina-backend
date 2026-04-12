import { GameResponse } from '../../types/game.types';
import { getGameOrThrow, assertOwner, toGameResponse } from './_helpers';

export const getUserGame = async (userId: string, gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);
  assertOwner(game, userId);
  return toGameResponse(game);
};
