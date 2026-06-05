import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';

export function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-screen-lg items-center justify-between px-4 md:px-6">
        <Link to="/events" className="font-bold">
          C.C Ticketing
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/events" className="text-muted-foreground hover:text-foreground">
            행사
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/reservations" className="text-muted-foreground hover:text-foreground">
                내 예매
              </Link>
              <Link to="/payments" className="text-muted-foreground hover:text-foreground">
                결제 내역
              </Link>
              <Link to="/me" className="text-muted-foreground hover:text-foreground">
                내 정보
              </Link>
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
