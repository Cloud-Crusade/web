import { apiClient } from '@/lib/apiClient';
import type { QueueResponse } from '@/types/queue';

const BASE = '/queue';

export const queueApi = {
  async getStatus(eventId: string): Promise<QueueResponse> {
    const { data } = await apiClient.get<QueueResponse>(`${BASE}/${eventId}`);
    return data;
  },
};
