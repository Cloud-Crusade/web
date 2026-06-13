import { useSearchParams } from 'react-router-dom';

// 목록 페이지의 page 파라미터를 URL 단일 출처로 관리. 잘못된 값(?page=foo 등)은 1로 폴백.
export function usePageParam(): { page: number; goToPage: (next: number) => void } {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const goToPage = (next: number) => {
    // 잘못된 값(0·음수·NaN)이 URL 에 남아 page(폴백 1)와 어긋나지 않도록 양의 정수로 정규화
    const target = Number.isFinite(next) && next > 0 ? Math.floor(next) : 1;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(target));
      return params;
    });
  };

  return { page, goToPage };
}
