import { processGift, updateGiftError } from '../../services/gifts/generate-gift';
import { GenerateGiftPayload } from '../../types/gift.types';

interface WorkerEvent {
  giftId: string;
  userId: string;
  payload: GenerateGiftPayload;
}

export const handler = async (event: WorkerEvent): Promise<void> => {
  const { giftId, payload } = event;
  try {
    await processGift(giftId, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gift generation failed';
    await updateGiftError(giftId, message).catch(() => {});
  }
};
