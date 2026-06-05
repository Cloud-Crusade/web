import { authHandlers } from './auth';
import { eventHandlers } from './events';
import { reservationHandlers } from './reservations';

export const handlers = [...authHandlers, ...eventHandlers, ...reservationHandlers];
