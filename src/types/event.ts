import type { Page } from '@/types/common';

export interface EventSchedule {
  start_at: string;
  end_at: string;
}

export interface EventRead {
  event_id: string;
  user_id: string;
  title: string; // ≤ 20
  body?: string;
  schedule: EventSchedule;
  img_urls: string[];
  total_seats: number;
  created_at: string; // date
  last_modified?: string;
}

export type EventPage = Page<EventRead>;
