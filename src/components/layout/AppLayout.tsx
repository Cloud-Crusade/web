import { Outlet } from 'react-router-dom';

import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-screen-lg flex-1 px-4 py-8 md:px-6">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © 2026 C.C Ticketing — Cloud Crusade
      </footer>
    </div>
  );
}
