# 성능 · 스파이크 UX

## 핵심 원칙

> **간략화 우선** — **측정 후 최적화**한다. 추측으로 `memo`·가상화·prefetch 를 깔지 않는다. 그리고 본 웹앱의 최우선 성능 목표는 LCP 숫자가 아니라 **티켓 오픈 스파이크 순간 사용자 경험이 무너지지 않는 것** — 202 폴링·503 백프레셔·409 충돌을 사용자가 견딜 수 있게 만드는 것이 1순위다.

## 트래픽 · 사용 패턴

백엔드는 평시 트래픽이 매우 낮다가 **티켓 오픈 순간 폭증**하는 인프라 검증 베드다 ([app/09-traffic-and-scaling.md](../../../app/.claude/rules/09-traffic-and-scaling.md)). 프론트는 그 순간 같은 행사로 몰린 사용자의 클라이언트다.

```
사용자 수
 │                  ┌───┐
 │                  │   │  ← 티켓 오픈 (같은 행사로 동시 몰림)
 │ ─────────────────┘   └──────────  ← 평시
 └────────────────────────────────────► 시간
```

| 평시 | 티켓 오픈 순간 |
|---|---|
| 행사 목록·상세 조회 위주 | 같은 행사 상세에서 동시에 예매 시도 |
| 에러 거의 없음 | **503**(백프레셔) · **409**(좌석 선점) · **202**(비동기 수락) 빈발 |
| 폴링 거의 없음 | 다수 사용자가 동시에 단건 GET 폴링 |

### 프론트 관점 영향
- **한 사용자가 여러 번 더블클릭** → 중복 write → 좌석 충돌·중복 예매 위험
- **503 이 떼로 돌아옴** → 무백오프 즉시 재시도하면 백엔드를 더 밀어붙임 (재시도 폭풍)
- **202 단건 폴링이 동시에 쏟아짐** → 폴링 주기가 짧으면 read 트래픽이 폭증

> 결론: 프론트는 **백엔드 백프레셔의 짝**으로 동작해야 한다. "조용히 물러서고 (백오프), 명확히 안내하고, 중복을 막는다."

## 코드 스플리팅

라우트 단위로 분할한다 ([01-architecture.md](01-architecture.md) 의 라우팅 구조와 연계). 초기 번들에 모든 페이지를 넣지 않는다.

```tsx
// src/app/router.tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RouteFallback } from "@/components/route-fallback";

const EventListPage = lazy(() => import("@/pages/events/event-list-page"));
const EventDetailPage = lazy(() => import("@/pages/events/event-detail-page"));
const MyReservationsPage = lazy(() => import("@/pages/reservations/my-reservations-page"));

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{node}</Suspense>
);

export const router = createBrowserRouter([
  { path: "/events", element: withSuspense(<EventListPage />) },
  { path: "/events/:eventId", element: withSuspense(<EventDetailPage />) },
  { path: "/me/reservations", element: withSuspense(<MyReservationsPage />) },
]);
```

### 청크 전략
- **route 기반 분할이 기본** — 페이지 단위 `lazy`
- **vendor 분리** — `react`/`react-dom`/`@tanstack/react-query` 등 무거운 의존성은 별도 청크로
- **무거운 컴포넌트는 동적 import** — 진입 즉시 필요 없는 것(차트·에디터류)은 `lazy`. 단 현재 시스템 범위([README.md](README.md))엔 그런 게 거의 없으므로 **과분할 금지**

```ts
// vite.config.ts — vendor 수동 청크 (필요할 때만)
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
        },
      },
    },
  },
});
```

> `Suspense` fallback 은 빈 화면이 아니라 스켈레톤/로딩 표시로 — 로딩 가시화는 [04-error-handling.md](04-error-handling.md), [08-design-system.md](08-design-system.md) 와 일관.

## 번들 최적화

### 원칙
- **무거운 의존성 점검** — 추가 전 import 비용 확인. `date-fns` 는 필요한 함수만, moment 같은 거대 라이브러리 도입 X
- **named import + tree-shaking** — `import { format } from "date-fns"` 처럼. `import * as` 회피
- **shadcn/ui 는 컴포넌트 단위 복사** — 쓰는 컴포넌트만 들어옴 (라이브러리 전체 번들링 아님)
- **아이콘은 개별 import** — `import { Calendar } from "lucide-react"` (전체 import 금지)

### 분석

```bash
# 빌드 후 청크 시각화
pnpm add -D rollup-plugin-visualizer
```

```ts
// vite.config.ts
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: "dist/stats.html", gzipSize: true }),
  ],
});
```

```bash
pnpm build            # dist/stats.html 생성 → 청크 구성 확인
```

### 규칙
- **PR 에서 번들이 눈에 띄게 커지면 원인 확인** — 새 의존성이 vendor 청크를 부풀렸는지
- **새 무거운 의존성은 [07-workflow.md](07-workflow.md) 의 "권한·의존성 최소화" 적용** — 기존 스택으로 가능하면 추가하지 않는다

## 렌더 성능

### 불필요한 리렌더 방지
- **올바른 key** — 리스트 key 는 `index` 가 아니라 안정적 식별자(`event.id`). index key 는 재정렬·삭제 시 오작동
- **컴포넌트 분리** — 자주 바뀌는 상태를 작은 컴포넌트로 격리해 리렌더 범위 축소
- **`memo`/`useMemo`/`useCallback` 은 측정 후** — 기본은 쓰지 않는다. React DevTools Profiler 로 실제 병목을 확인한 뒤에만 적용

```tsx
// 좋음 — 안정적 key
{events.map((event) => (
  <EventCard key={event.id} event={event} />
))}

// 나쁨 — index key (재정렬/삭제 시 상태 꼬임)
{events.map((event, i) => (
  <EventCard key={i} event={event} />
))}
```

### 큰 목록 가상화
- **행사 목록은 페이지네이션(page/size)** 으로 이미 한 화면 분량만 받는다 → **가상화 불필요**
- 한 화면에 수백 row 를 렌더해야 하는 상황이 실제로 생기면 그때 `@tanstack/react-virtual` 도입. **선제 도입 금지**

> 페이지당 size 가 합리적(기본 20)이면 가상화는 과한 최적화다 ([02-api-integration.md](02-api-integration.md) 페이지네이션).

## TanStack Query 캐싱 전략 (핵심)

서버 상태는 전부 TanStack Query 로 관리한다 ([03-state-and-data.md](03-state-and-data.md)). 캐시를 잘 쓰면 스파이크 때 **불필요한 read 요청 자체를 줄인다.**

### staleTime / gcTime 가이드

| 데이터 | staleTime | gcTime | 이유 |
|---|---|---|---|
| 행사 목록 (`["events", page]`) | 30s ~ 1m | 5m | 자주 안 바뀜. 목록↔상세 왕복 시 재요청 절감 |
| 행사 상세 (`["event", id]`) | 30s | 5m | 상세도 비교적 안정. 목록에서 prefetch 가능 |
| 내 예매 단건 (폴링 중, `["reservation", id]`) | 0 | 5m | 처리중→확정 전이를 봐야 하므로 항상 stale |
| 내 예매 목록 (`["reservations"]`) | 10s | 5m | write 반영을 빠르게 보되 과도한 재요청은 억제 |

```ts
// src/lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,                 // 503 백오프는 axios 인터셉터가 담당 (아래)
      refetchOnWindowFocus: false,
    },
  },
});
```

### prefetch (상세 진입 전)

목록 카드 hover/포커스 시 상세를 미리 받아두면 클릭 후 즉시 표시된다.

```ts
const prefetchEvent = (eventId: string) =>
  queryClient.prefetchQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEvent(eventId),
    staleTime: 30_000,
  });
```

### placeholderData (페이지네이션 부드럽게)

페이지 이동 시 이전 페이지를 유지해 깜빡임을 없앤다.

```ts
import { keepPreviousData } from "@tanstack/react-query";

const { data, isPlaceholderData } = useQuery({
  queryKey: ["events", page],
  queryFn: () => fetchEvents({ page, size: 20 }),
  placeholderData: keepPreviousData,
});
```

### 중복 요청 dedupe
- **같은 queryKey 동시 호출은 Query 가 자동으로 1회로 합친다** — 같은 행사 상세를 여러 컴포넌트가 동시에 구독해도 네트워크 요청은 1개
- 따라서 **컴포넌트에서 직접 fetch 금지** — Query 훅으로만 ([03-state-and-data.md](03-state-and-data.md)). 직접 fetch 하면 dedupe 가 안 된다

## 스파이크 UX (핵심 — 백엔드 백프레셔의 짝)

### 1. 202 비동기 처리 — 폴링 백오프

예매·결제 생성/취소는 `202 {id, status:"accepted"}` 를 반환한다 (SQS→Lambda). 반환된 `id` 로 단건 GET 을 폴링해 확정 상태를 확인한다 ([02-api-integration.md](02-api-integration.md)).

```ts
// src/features/reservations/use-reservation-status.ts
const POLL_INTERVAL = 1_500;   // 고정 주기 1.5s
const POLL_TIMEOUT = 30_000;   // 30s 안에 확정 안 되면 중단

export function useReservationStatus(reservationId: string | null) {
  const startedAt = useRef(Date.now());

  return useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => fetchReservation(reservationId!),
    enabled: reservationId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // 확정/실패면 폴링 중단
      if (status === "confirmed" || status === "failed") return false;
      // 타임아웃 초과 시 중단
      if (Date.now() - startedAt.current > POLL_TIMEOUT) return false;
      return POLL_INTERVAL;
    },
  });
}
```

- **확정 시 즉시 중단** — `refetchInterval` 이 `false` 반환
- **최대 타임아웃** — 무한 폴링 금지. 초과 시 "처리 지연" 안내 후 사용자 재확인 유도
- **중복 폴링 방지** — 같은 `["reservation", id]` 키라 Query 가 자동 dedupe. 화면 여러 곳에서 같은 훅을 써도 폴링 루프는 1개

### 2. 503 백프레셔 — Retry-After + 지수 백오프 + jitter

백엔드는 과부하 시 `503 + Retry-After`(1~3초) 를 준다. 클라이언트는 **그 값을 존중**하고, 없으면 지수 백오프 + jitter 로 재시도한다. 재시도 횟수는 제한한다 ([04-error-handling.md](04-error-handling.md)).

```ts
// src/lib/http.ts — axios 인터셉터
const MAX_RETRY = 3;
const BASE_DELAY = 1_000;

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetryConfig;
  if (error.response?.status !== 503 || config == null) throw error;

  config.retryCount = (config.retryCount ?? 0) + 1;
  if (config.retryCount > MAX_RETRY) throw error;   // 제한 초과 → 사용자에게 위임

  // Retry-After(초) 존중, 없으면 지수 백오프 + full jitter
  const retryAfter = Number(error.response.headers["retry-after"]);
  const delay = Number.isFinite(retryAfter)
    ? retryAfter * 1_000
    : Math.random() * Math.min(8_000, BASE_DELAY * 2 ** config.retryCount);

  await new Promise((r) => setTimeout(r, delay));
  return api(config);
});
```

- **재시도 소진 시** — 토스트로 "지금 접속이 몰려 있어요. 잠시 후 다시 시도해 주세요" 안내 ([04-error-handling.md](04-error-handling.md))
- **read 요청에만 인터셉터 재시도 적용** — 비멱등 write(예매/결제 생성)는 인터셉터 자동 재시도 대상에서 제외하고, 사용자 명시 재시도로 (아래 "중복 제출 방지")

### 3. 409 좌석 선점 충돌

좌석이 이미 선점되면 `409` 가 온다. **즉시 피드백 + 좌석/목록 갱신**, 자동 재시도는 하지 않는다.

```ts
const reserve = useMutation({
  mutationFn: createReservation,
  onError: (error) => {
    if (isStatus(error, 409)) {
      toast.error("이미 선점된 좌석입니다. 다른 좌석을 선택해 주세요.");
      queryClient.invalidateQueries({ queryKey: ["event", eventId] }); // 잔여 갱신
    }
  },
});
```

- **무한 재시도 금지** — 409 는 비즈니스 결과(좌석 사라짐)다. 재시도해도 같은 결과
- **목록/잔여 갱신** — 사용자가 최신 좌석 상태를 보게 한다

### 4. 중복 제출 방지

write 는 멱등하지 않다. 더블클릭으로 같은 예매가 두 번 들어가면 안 된다.

```tsx
const { mutate, isPending } = useMutation({ mutationFn: createReservation });

<Button disabled={isPending} onClick={() => mutate(payload)}>
  {isPending ? "예매 처리 중..." : "예매하기"}
</Button>
```

- **`isPending` 동안 버튼 비활성** — 진행 중 재클릭 차단
- **202 수락 후 폴링 종료 전까지도 버튼 잠금 유지** — "처리 중" 동안 다시 못 누르게

### 5. 낙관적 업데이트는 신중

서버 write 가 SQS→Lambda 로 **비동기 확정**이므로, 낙관적 업데이트는 "성공 가정"이 빗나갈 위험이 크다.
- **단순 토글성 UI(읽음 표시 등)** 외에 **예매·결제 확정에는 낙관적 업데이트를 쓰지 않는다** — 202 → 폴링 → 실제 상태 반영이 정직하다 ([03-state-and-data.md](03-state-and-data.md))
- 굳이 쓴다면 `onError` 롤백을 반드시 구현

## 이미지 최적화

행사 데이터는 `img_urls`(jsonb 이미지 리스트)를 가진다.

```tsx
<img
  src={url}
  loading="lazy"                      // 뷰포트 진입 시 로드
  decoding="async"
  className="aspect-video w-full object-cover"  // 비율 고정 → CLS 방지
  onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE)}
  alt={event.title}
/>
```

### 규칙
- **`loading="lazy"`** — 목록의 여러 이미지를 한꺼번에 받지 않는다
- **비율 고정(`aspect-*`)** — 로드 전후 레이아웃 점프(CLS) 방지
- **폴백** — 깨진 URL 은 기본 이미지로 대체
- **다수 이미지 절제** — 상세에서 `img_urls` 전체를 원본으로 동시 로드하지 않는다. 썸네일/캐러셀로 보이는 것만 우선 로드
- **CDN/리사이즈는 시스템 범위 밖** ([README.md](README.md)) — 원본 무제한 로드만 피하면 충분

## 네트워크

- **동시 요청 절제** — 한 화면 진입에 불필요하게 여러 쿼리를 띄우지 않는다. 필요한 데이터만
- **페이지네이션 size 합리값** — 기본 20, 최대 한도 준수 ([02-api-integration.md](02-api-integration.md)). 한 번에 수백 건 요청 금지
- **불필요 폴링 금지** — 폴링은 **202 확정 대기 중인 단건**에만. 목록·상세를 짧은 주기로 반복 폴링하지 않는다
- **확정/이탈 시 폴링 종료** — 페이지 unmount·확정 상태 도달 시 `refetchInterval` 종료

## 측정 기준

| 항목 | 목표 | 도구 |
|---|---|---|
| LCP | < 2.5s | Lighthouse |
| CLS | < 0.1 | Lighthouse (이미지 비율 고정으로 확보) |
| TBT | < 300ms | Lighthouse |
| 초기 JS 번들 (gzip) | < 200KB | rollup-plugin-visualizer |
| 초기 로드 (평시) | < 3s (3G fast 기준) | Lighthouse / Network 탭 |
| 폴링 주기 | 1~1.5s 고정, 30s 타임아웃 | 코드 리뷰 |

> 수치는 목표선이다. **측정 없이 추측으로 최적화하지 않는다.**

## 로컬 · 실측 가이드

```bash
pnpm build && pnpm preview     # 프로덕션 번들로 로컬 서빙 (dev 서버 아님)
```

- **Lighthouse** — `pnpm preview` 로 띄운 빌드 결과에 대해 측정 (dev 서버는 비최적화라 무의미)
- **번들 분석** — `dist/stats.html` 로 청크 구성 확인
- **React DevTools Profiler** — 리렌더 병목은 추측 말고 Profiler 로
- **스파이크 동작 확인** — 백엔드 staging 에 Locust 부하([app/09-traffic-and-scaling.md](../../../app/.claude/rules/09-traffic-and-scaling.md))를 거는 중에 프론트가 503/409/202 를 제대로 처리하는지(백오프·안내·폴링 종료) 실측

## 안티 패턴

### 금지
- **측정 없는 선제 최적화** — Profiler/Lighthouse 근거 없이 `memo`·가상화·prefetch 깔기
- **전역 `memo`/`useMemo`/`useCallback` 남발** — 거의 모든 컴포넌트에 기계적으로 붙이기
- **503 즉시·무백오프 재시도** — 재시도 폭풍으로 백엔드를 더 밀어붙임 (Retry-After·백오프·횟수 제한 필수)
- **409 좌석 충돌 자동 무한 재시도** — 같은 결과 반복. 즉시 피드백 + 갱신으로
- **무한·과빈도 폴링** — 타임아웃·확정 시 중단 없음 / 목록을 짧은 주기로 반복 폴링
- **중복 제출 미차단** — `isPending` 으로 버튼 잠그지 않아 더블클릭으로 중복 write
- **비동기 확정 전 낙관적 업데이트로 "성공" 표시** — 202 미확정인데 완료처럼 보이게
- **거대 단일 번들** — route 분할 없이 모든 페이지를 초기 청크에
- **리스트 index key** — 재정렬·삭제 시 상태 꼬임
- **이미지 원본 무제한 동시 로드** — `loading="lazy"`·비율 고정 없이 `img_urls` 전체 원본 렌더
- **컴포넌트에서 직접 fetch** — Query dedupe 무력화 + 캐시 누락
