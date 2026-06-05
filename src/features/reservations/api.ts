import { apiClient } from '@/lib/apiClient';
import type { PageParams } from '@/types/common';
import type {
  OccupiedSeats,
  ReservationAccepted,
  ReservationPage,
  ReservationRead,
} from '@/types/reservation';

import type { ReservationCreateInput } from './schema';

const BASE = '/reservations';

export const reservationApi = {
  async list(params: PageParams): Promise<ReservationPage> {
    const { data } = await apiClient.get<ReservationPage>(BASE, { params });
    return data;
  },

  async get(reservationId: string): Promise<ReservationRead> {
    const { data } = await apiClient.get<ReservationRead>(`${BASE}/${reservationId}`);
    return data;
  },

  async occupiedSeats(eventId: string): Promise<OccupiedSeats> {
    const { data } = await apiClient.get<OccupiedSeats>(`${BASE}/seats/occupied`, {
      params: { event_id: eventId },
    });
    return data;
  },

  // 202 Accepted — 비동기 write (SQS→Lambda). 반영 확인은 단건 조회 폴링으로 (02 룰셋)
  async create(payload: ReservationCreateInput): Promise<ReservationAccepted> {
    const { data } = await apiClient.post<ReservationAccepted>(BASE, payload);
    return data;
  },

  async cancel(reservationId: string): Promise<ReservationAccepted> {
    const { data } = await apiClient.delete<ReservationAccepted>(`${BASE}/${reservationId}`);
    return data;
  },
};
