import { apiClient } from '@/lib/apiClient';
import type { PageParams } from '@/types/common';
import type { EventPage, EventRead } from '@/types/event';

import type { EventCreateInput, EventUpdateInput } from './schema';

const BASE = '/events';

export const eventApi = {
  async list(params: PageParams): Promise<EventPage> {
    const { data } = await apiClient.get<EventPage>(BASE, { params });
    return data;
  },

  async get(eventId: string): Promise<EventRead> {
    const { data } = await apiClient.get<EventRead>(`${BASE}/${eventId}`);
    return data;
  },

  async create(payload: EventCreateInput): Promise<EventRead> {
    const { data } = await apiClient.post<EventRead>(BASE, payload);
    return data;
  },

  async update(eventId: string, payload: EventUpdateInput): Promise<EventRead> {
    const { data } = await apiClient.patch<EventRead>(`${BASE}/${eventId}`, payload);
    return data;
  },

  async remove(eventId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${eventId}`);
  },
};
