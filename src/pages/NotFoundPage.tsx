import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-lg font-medium">페이지를 찾을 수 없어요</p>
      <Button asChild>
        <Link to="/events">행사 목록으로</Link>
      </Button>
    </section>
  );
}
