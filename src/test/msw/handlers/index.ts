import { authHandlers } from './auth';
import { eventHandlers } from './events';
import { paymentHandlers } from './payments';
import { queueHandlers } from './queue';
import { reservationHandlers } from './reservations';

export const handlers = [
  ...authHandlers,
  ...eventHandlers,
  ...reservationHandlers,
  ...paymentHandlers,
  ...queueHandlers,
];
