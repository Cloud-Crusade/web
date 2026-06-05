import { apiClient } from '@/lib/apiClient';
import type { QueueStatus } from '@/types/queue';

const BASE = '/queue';

export const queueApi = {
  async getStatus(eventId: string): Promise<QueueStatus> {
    const { data } = await apiClient.get<QueueStatus>(`${BASE}/${eventId}`);
    return data;
  },
};
