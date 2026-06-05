import { Outlet } from 'react-router-dom';

import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-screen-lg px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
