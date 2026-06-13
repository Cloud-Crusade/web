import { useSearchParams } from 'react-router-dom';

// 목록 페이지의 page 파라미터를 URL 단일 출처로 관리. 잘못된 값(?page=foo 등)은 1로 폴백.
export function usePageParam(): { page: number; goToPage: (next: number) => void } {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const goToPage = (next: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(next));
      return params;
    });
  };

  return { page, goToPage };
}
