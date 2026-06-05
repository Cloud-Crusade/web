import { authHandlers } from './auth';
import { eventHandlers } from './events';
import { paymentHandlers } from './payments';
import { reservationHandlers } from './reservations';

export const handlers = [
  ...authHandlers,
  ...eventHandlers,
  ...reservationHandlers,
  ...paymentHandlers,
];
