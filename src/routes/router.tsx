import { lazy, type ReactNode, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const EventListPage = lazy(() => import('@/pages/EventListPage'));
const EventDetailPage = lazy(() => import('@/pages/EventDetailPage'));
const EventCreatePage = lazy(() => import('@/pages/EventCreatePage'));
const MyReservationsPage = lazy(() => import('@/pages/MyReservationsPage'));
const ReservationDetailPage = lazy(() => import('@/pages/ReservationDetailPage'));
const MyPaymentsPage = lazy(() => import('@/pages/MyPaymentsPage'));
const MyPage = lazy(() => import('@/pages/MyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const withSuspense = (node: ReactNode): ReactNode => (
  <Suspense fallback={<p className="py-16 text-center text-muted-foreground">불러오는 중…</p>}>
    {node}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: withSuspense(<EventListPage />) },
      { path: 'login', element: withSuspense(<LoginPage />) },
      { path: 'signup', element: withSuspense(<SignupPage />) },
      { path: 'events', element: withSuspense(<EventListPage />) },
      { path: 'events/:eventId', element: withSuspense(<EventDetailPage />) },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'events/new', element: withSuspense(<EventCreatePage />) },
          { path: 'reservations', element: withSuspense(<MyReservationsPage />) },
          { path: 'reservations/:reservationId', element: withSuspense(<ReservationDetailPage />) },
          { path: 'payments', element: withSuspense(<MyPaymentsPage />) },
          { path: 'me', element: withSuspense(<MyPage />) },
        ],
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]);
