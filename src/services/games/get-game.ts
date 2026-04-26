import { GameResponse } from '../../types/game.types';
import { getGameOrThrow, toGameResponse } from './_helpers';

export const getUserGame = async (gameId: string): Promise<GameResponse> => {
  const game = await getGameOrThrow(gameId);

  return toGameResponse(game);
};
