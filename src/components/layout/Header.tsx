import { Ticket } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm transition-colors',
    isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
  );

export function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-screen-lg items-center justify-between px-4 md:px-6">
        <Link to="/events" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Ticket className="size-4" aria-hidden />
          </span>
          C.C Ticketing
        </Link>
        <nav className="flex items-center gap-4">
          <NavLink to="/events" className={navLinkClass}>
            행사
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/reservations" className={navLinkClass}>
                내 예매
              </NavLink>
              <NavLink to="/payments" className={navLinkClass}>
                결제 내역
              </NavLink>
              <NavLink to="/me" className={navLinkClass}>
                내 정보
              </NavLink>
              <Button size="sm" variant="outline" onClick={logout}>
                로그아웃
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">로그인</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
