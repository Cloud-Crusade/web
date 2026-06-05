import type { Page } from '@/types/common';

export interface ReservationAccepted {
  reservation_id: string;
  status: string; // "accepted"
}

export interface ReservationRead {
  reservation_id: string;
  user_id: string;
  event_id: string;
  is_canceled: boolean;
  reserved_num: number;
  created_at: string;
  last_modified?: string;
}

export type ReservationPage = Page<ReservationRead>;

export interface OccupiedSeats {
  event_id: string;
  occupied: number[];
}
