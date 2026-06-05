export interface QueueStatus {
  event_id: string;
  position: number;
  status: 'waiting' | 'admitted';
}
