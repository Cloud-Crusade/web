# 상태 관리 · 데이터 처리

## 핵심 원칙

> **간략화 우선** — Redux·Zustand·Recoil 같은 전역 상태 라이브러리는 도입 금지. **서버에서 온 데이터는 전부 TanStack Query** 가 소유하고, 클라이언트 상태는 인증 토큰 정도로 최소화한다. "혹시 전역에 두면 편할까" 식의 store 확장 금지.

본 문서는 백엔드 룰셋 [`03-domain-and-data.md`](../../../app/.claude/rules/03-domain-and-data.md) 를 프론트엔드에 치환한 것이다. 백엔드의 `model → repository → service` 책임 분리는 프론트에서 `서버 상태(Query) → 데이터 모듈(api/hooks) → 폼/파생 상태` 로 매핑된다. API 호출 자체(Axios·인터셉터·202 폴링 베이스)는 [02-api-integration.md](02-api-integration.md) 에 정의하고, 본 문서는 그 위에서 **상태를 어디에 두고 어떻게 동기화하는가** 를 다룬다.

## 상태 분류 — 무엇을 어디에 두는가

상태는 4 종류뿐이다. 새 상태가 생기면 아래 표로 위치를 결정한다.

| 종류 | 저장 위치 | 예시 | 결정 기준 |
|---|---|---|---|
| **서버 상태** | TanStack Query 캐시 | 행사 목록·상세, 내 예매, 결제 내역, 내 정보 | "서버가 진실의 출처"인 모든 것. fetch 로 가져오는 데이터는 전부 여기 |
| **전역 클라이언트 상태** | React Context (`AuthContext`) | 로그인 여부, access token 보유, 현재 사용자 식별 | 여러 라우트가 공유 + 새로고침/네비게이션을 넘어 유지되어야 하는 클라 전용 값 |
| **로컬 UI 상태** | `useState` / `useReducer` | 모달 열림, 탭 선택, 드롭다운, 폼 입력 중간값 | 한 컴포넌트(또는 좁은 트리)에서만 쓰고, 새로고침 시 사라져도 되는 값 |
| **URL 상태** | `useSearchParams` (React Router) | 목록 페이지 번호·검색어·정렬, 상세 `id` | 북마크·공유·새로고침에 보존돼야 하고 뒤로가기로 복원돼야 하는 값 |

### 결정 규칙
- **서버에서 온 데이터를 `useState` 에 복사하지 않는다** — Query 캐시가 단일 출처. 복사하면 stale 사본이 생김 (안티패턴 1)
- **목록의 페이지·검색·필터는 URL 에** — Query 의 `queryKey` 가 그대로 URL 파라미터를 미러링하면 캐시·뒤로가기·공유가 공짜로 따라온다
- **인증은 Context, 나머지 전역은 만들지 않는다** — "테마" 같은 게 정말 생기면 그때 Context 하나 추가. store 객체에 서버 데이터 보관 금지 (안티패턴 4)
- **파생 데이터는 저장하지 않는다** — 렌더 중 계산하거나 `useMemo` (아래 "파생 상태" 절)

## 도메인별 데이터 모듈 구조

백엔드가 `domains/<name>/{model,schema,repository,service}.py` 인 것처럼, 프론트는 `features/<domain>/` 한 디렉토리로 도메인을 캡슐화한다.

```
features/<domain>/
├── api.ts          # Axios 호출만 (02-api-integration.md). HTTP 경계
├── hooks.ts        # useQuery / useMutation 훅 (서버 상태 캡슐화)
├── schema.ts       # Zod 스키마 + 추론 타입 (요청/응답/폼)
└── components/     # 표현 컴포넌트 (상태는 hooks 로만 접근)
```

### 도메인 매핑

| 도메인 디렉토리 | 백엔드 도메인 | 주요 서버 상태 |
|---|---|---|
| `features/auth` | auth/users | 토큰 발급/갱신, 내 정보(`['me']`) |
| `features/events` | events | 행사 목록·상세 |
| `features/reservations` | reservations | 내 예매 목록·단건(비동기 202) |
| `features/payments` | payments | 결제 요청·내역(비동기 202) |

### 규칙
- **컴포넌트는 `hooks.ts` 만 import** — `api.ts` 를 컴포넌트에서 직접 부르지 않는다 (안티패턴 3)
- **`api.ts` 는 axios 호출 + 응답 타입만** — 캐싱·invalidate 모르게 한다. 그건 `hooks.ts` 책임
- **`schema.ts` 는 Zod 단일 출처** — 폼 검증과 응답 파싱이 같은 스키마를 공유

## TanStack Query 규약

### queryKey 설계

queryKey 는 캐시의 주소다. **계층 + 파라미터** 구조로 일관되게 짠다.

| 데이터 | queryKey | 비고 |
|---|---|---|
| 행사 목록 | `['events', { page, size, ...filters }]` | 파라미터 객체를 두 번째 요소로 |
| 행사 단건 | `['event', eventId]` | 단건은 단수 키 + id |
| 내 예매 목록 | `['reservations', { scope: 'me', page }]` | 사용자 스코프 명시 |
| 예매 단건 | `['reservation', reservationId]` | 202 폴링 대상 |
| 결제 단건 | `['payment', paymentId]` | 202 폴링 대상 |
| 내 정보 | `['me']` | 파라미터 없음 |

### queryKey 팩토리 패턴

문자열을 컴포넌트마다 하드코딩하면 오타·무효화 누락이 생긴다 (안티패턴 5). **도메인마다 키 팩토리를 `hooks.ts` 상단에 둔다.**

```ts
// features/events/hooks.ts
export const eventKeys = {
  all: ['events'] as const,
  list: (params: EventListParams) => ['events', params] as const,
  detail: (eventId: string) => ['event', eventId] as const,
};
```

- `eventKeys.all` (`['events']`) 로 목록 전체를 한 번에 무효화
- `eventKeys.detail(id)` 로 단건만 정밀 무효화
- mutation 의 `invalidateQueries` 도 반드시 이 팩토리를 통한다

### staleTime / gcTime 기본값

| 데이터 성격 | staleTime | gcTime | 예시 |
|---|---|---|---|
| 자주 안 바뀌는 읽기 | `60_000` (1분) | `5분`(기본) | 행사 목록·상세 |
| 사용자 개인 데이터 | `30_000` | `5분` | 내 예매·결제 목록 |
| 202 폴링 단건 | `0` (항상 stale) | `5분` | 처리 중 예매/결제 |

- 전역 기본값은 `lib/queryClient.ts` 에 설정, 개별 훅에서 필요 시 override
- 세부 캐싱·프리페치 전략은 [09-performance.md](09-performance.md) 참조

```ts
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,                  // 401/4xx 재시도는 02 의 인터셉터/가드 정책 우선
      refetchOnWindowFocus: false,
    },
  },
});
```

### enabled 가드

- **인증 필요 쿼리는 토큰 없으면 끈다** — `enabled: isAuthenticated`
- **필수 파라미터가 없으면 끈다** — `enabled: !!eventId`

```ts
export function useReservations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: reservationKeys.list({ scope: 'me' }),
    queryFn: fetchMyReservations,
    enabled: isAuthenticated,
  });
}
```

## useQuery 패턴

### 목록 조회 (URL 상태와 결합)

```ts
// features/events/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from './api';
import type { EventListParams } from './schema';

export function useEvents(params: EventListParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => fetchEvents(params),
  });
}
```

```tsx
// features/events/components/EventListPage.tsx
import { useSearchParams } from 'react-router-dom';

export function EventListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');

  const { data, isPending, isError } = useEvents({ page, size: 20 });

  if (isPending) return <ListSkeleton />;      // 04-error-handling.md
  if (isError) return <ErrorState />;

  return (
    <EventGrid
      events={data.items}
      page={page}
      total={data.total}
      onPageChange={(next) => setSearchParams({ page: String(next) })}
    />
  );
}
```

- **페이지 상태는 URL** → `queryKey` 가 URL 을 미러 → 뒤로가기/공유가 자동 동작

### 단건 조회

```ts
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
  });
}
```

## useMutation 패턴

write 는 mutation 으로, 성공 시 관련 쿼리를 무효화해 화면을 갱신한다.

### 생성

```ts
// features/events/hooks.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEvent } from './api';
import type { EventCreateInput } from './schema';

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventCreateInput) => createEvent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
```

### 수정

```ts
export function useUpdateEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventUpdateInput) => updateEvent(eventId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
```

### 삭제

```ts
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: (_data, eventId) => {
      qc.removeQueries({ queryKey: eventKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
```

### 규칙
- **`onSuccess` 에서 `invalidateQueries`** — 수동으로 캐시를 직접 set 하기보다 무효화 후 재조회가 기본 (단순함 우선)
- **삭제는 `removeQueries`** 로 단건 캐시 제거 + 목록 무효화
- **mutation 의 에러 → 토스트·필드 에러** 매핑은 [04-error-handling.md](04-error-handling.md) 참조

## 캐시 무효화 정책

어떤 mutation 이 어떤 queryKey 를 건드리는지 한눈에. **mutation 작성 시 이 표를 기준으로 `onSuccess` 를 채운다.**

| Mutation | 무효화/제거 대상 | 이유 |
|---|---|---|
| 행사 생성 | `['events']` | 목록에 새 행사 반영 |
| 행사 수정 | `['event', id]` + `['events']` | 단건·목록 모두 갱신 |
| 행사 삭제 | `remove ['event', id]` + `['events']` | 단건 제거 + 목록 갱신 |
| 예매 생성(202) | `['reservations', {scope:'me'}]` + 반환 id 단건 폴링 시작 | 내 예매 목록 갱신 + 처리 상태 추적 |
| 예매 취소(202) | `['reservation', id]` + `['reservations', {scope:'me'}]` | 해당 단건 + 목록 갱신 |
| 결제 요청(202) | `['payment', id]`(폴링) + `['reservation', reservationId]` | 결제 단건 추적 + 연관 예매 상태 갱신 |

> 비동기 write 는 202 직후 서버 DB 에 아직 반영 전일 수 있다 → 무효화만으로는 즉시 최신이 아니다. **반환 id 로 단건 폴링** 을 병행한다 (아래 "비동기 202 폴링" 절).

## 낙관적 업데이트 (Optimistic Update)

토글성·즉시 피드백이 중요한 동작(예: 예매 취소)에만 선택적으로 적용한다. 과용 금지 — 대부분은 invalidate 로 충분하다.

```ts
// features/reservations/hooks.ts
export function useCancelReservation() {
  const qc = useQueryClient();
  const listKey = reservationKeys.list({ scope: 'me' });

  return useMutation({
    mutationFn: (reservationId: string) => cancelReservation(reservationId),

    onMutate: async (reservationId) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<ReservationList>(listKey);
      // 낙관적: 해당 예매를 '취소중'으로 즉시 표시
      qc.setQueryData<ReservationList>(listKey, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((r) =>
                r.id === reservationId ? { ...r, status: 'canceling' } : r,
              ),
            }
          : old,
      );
      return { previous };
    },

    onError: (_err, _id, context) => {
      // 실패 시 롤백
      if (context?.previous) qc.setQueryData(listKey, context.previous);
    },

    onSettled: () => {
      // 성공/실패 무관하게 서버 진실로 재동기화
      qc.invalidateQueries({ queryKey: listKey });
    },
  });
}
```

### 규칙
- **`onMutate` 에서 `cancelQueries` 먼저** — 진행 중 refetch 가 낙관적 값을 덮어쓰는 것 방지
- **`onError` 에서 snapshot 으로 롤백** — `onMutate` 가 반환한 context 사용
- **`onSettled` 에서 무조건 invalidate** — 서버가 최종 진실. 비동기 202 라면 단건 폴링이 확정 상태를 가져온다

## 비동기 202 폴링을 Query 로

예매·결제 생성/취소는 `202 { id, status: "accepted" }` 를 반환하고 실제 처리는 SQS→Lambda 비동기다. 반환 `id` 로 **단건 GET 을 폴링** 해 확정 상태를 받는다. 이를 `refetchInterval` 로 표현한다.

```ts
// features/reservations/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { fetchReservation } from './api';

const TERMINAL = ['confirmed', 'canceled', 'failed'] as const;

export function useReservationStatus(reservationId: string | undefined) {
  return useQuery({
    queryKey: reservationKeys.detail(reservationId ?? ''),
    queryFn: () => fetchReservation(reservationId!),
    enabled: !!reservationId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // accepted/processing 동안만 폴링, 확정되면 중단
      if (status && TERMINAL.includes(status)) return false;
      return 1500;
    },
  });
}
```

흐름: mutation 이 202 로 받은 `id` 를 컴포넌트 state 에 보관 → 그 id 로 위 폴링 훅 활성화 → status 가 terminal 이 되면 `refetchInterval` 이 `false` 를 반환해 폴링 중단 + 목록 invalidate.

```tsx
function ReservationCreateButton({ eventId }: { eventId: string }) {
  const [pendingId, setPendingId] = useState<string>();
  const create = useCreateReservation();           // 202 → { id }
  const { data: detail } = useReservationStatus(pendingId);

  const onClick = () =>
    create.mutate(
      { event_id: eventId, reserved_num: 1 },
      { onSuccess: ({ id }) => setPendingId(id) },
    );

  return (
    <PendingButton
      onClick={onClick}
      // accepted~processing 동안 처리중 표시
      pending={create.isPending || (!!pendingId && detail?.status === 'accepted')}
    />
  );
}
```

### 규칙
- **폴링 중단 조건은 terminal status** — 무한 폴링 금지. 백오프·최대 시도 한도는 [02-api-integration.md](02-api-integration.md)·[09-performance.md](09-performance.md) 의 폴링 정책을 따른다
- **폴링 단건은 `staleTime: 0`** — 항상 최신 상태를 받아야 함
- **확정되면 목록 invalidate** — `onSuccess`(detail) 또는 컴포넌트에서 terminal 감지 시

## 폼 + 검증 (React Hook Form + Zod)

폼 입력값은 로컬 UI 상태(RHF 가 관리), 검증은 Zod, 제출은 mutation 이다. Zod 스키마는 **백엔드 입력 제약을 미러링** 한다.

### schema.ts — 백엔드 제약 미러

```ts
// features/auth/schema.ts
import { z } from 'zod';

export const signupSchema = z.object({
  user_name: z.string().min(1).max(255),       // 백엔드: ≤255
  password: z.string().min(1).max(72),         // 백엔드: ≤72 (bcrypt 한계)
});
export type SignupInput = z.infer<typeof signupSchema>;
```

```ts
// features/events/schema.ts
export const eventCreateSchema = z
  .object({
    title: z.string().min(1).max(20),          // 백엔드: ≤20
    body: z.string().optional(),
    schedule: z.object({
      start_at: z.string().datetime(),
      end_at: z.string().datetime(),
    }),
    img_urls: z.array(z.string().url()),
    total_seats: z.number().int().min(1),       // 백엔드: ≥1
  })
  .refine((v) => v.schedule.start_at < v.schedule.end_at, {
    message: '종료 시각은 시작 시각보다 이후여야 합니다',
    path: ['schedule', 'end_at'],
  });
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
```

| 폼 | 필드 제약 (백엔드 미러) |
|---|---|
| signup/login | `user_name` ≤255, `password` ≤72 |
| event | `title` ≤20, `body?`, `schedule.start_at < end_at`, `img_urls:string[]`, `total_seats` ≥1 |
| reservation | `event_id`, `reserved_num` ≥1 |
| payment | `reservation_id`, `payment_method` 1~20자 |

### 폼 컴포넌트 — zodResolver + 제출 시 mutation

```tsx
// features/events/components/EventCreateForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventCreateSchema, type EventCreateInput } from '../schema';
import { useCreateEvent } from '../hooks';
import { applyServerFieldErrors } from '@/lib/formErrors'; // 04-error-handling.md

export function EventCreateForm() {
  const form = useForm<EventCreateInput>({
    resolver: zodResolver(eventCreateSchema),
    defaultValues: { title: '', img_urls: [], total_seats: 1 },
  });
  const createEvent = useCreateEvent();

  const onSubmit = form.handleSubmit((values) => {
    createEvent.mutate(values, {
      onError: (error) => applyServerFieldErrors(error, form.setError), // 422 → 필드
    });
  });

  return (
    <form onSubmit={onSubmit}>
      {/* shadcn/ui Form 필드 — 08-design-system.md */}
      <SubmitButton pending={createEvent.isPending} />
    </form>
  );
}
```

### 서버 422 → 필드 에러 매핑

- 백엔드 검증 실패는 `422 { code, message, details }` → `details` 를 RHF `setError` 로 필드에 매핑
- 매핑 헬퍼(`applyServerFieldErrors`)와 전역 토스트 처리는 [04-error-handling.md](04-error-handling.md) 에 정의
- **클라 Zod 검증과 서버 검증은 둘 다 필요** — Zod 는 즉각 UX, 서버는 최종 신뢰 경계

## 파생/계산 상태

서버 상태나 props 에서 계산되는 값은 **저장하지 않는다.**

```tsx
// 좋음 — 렌더 중 계산 (가벼우면 그냥)
const soldOut = event.total_seats - event.reserved_count <= 0;

// 좋음 — 비용이 큰 변환만 메모이즈
const sortedEvents = useMemo(
  () => [...events].sort((a, b) => a.schedule.start_at.localeCompare(b.schedule.start_at)),
  [events],
);

// 나쁨 — 파생값을 state 에 복사 (동기화 버그)
const [soldOut, setSoldOut] = useState(false);
useEffect(() => setSoldOut(event.available <= 0), [event]); // ❌
```

- **`useMemo` 과용 금지** — 단순 산술·불리언은 그냥 렌더 중 계산
- **`useEffect` 로 파생값을 state 에 동기화 금지** — 렌더 중 계산이 항상 정답

## 안티 패턴

### 금지
1. **서버 데이터를 `useState` 로 복사** — Query 캐시가 단일 출처. 복사본은 stale
2. **`useEffect` 로 수동 fetch** — `fetch` + `setState` 패턴 금지. `useQuery` 가 로딩·에러·캐시·재조회를 처리
3. **컴포넌트에서 직접 `axios` 호출** — 반드시 `features/<domain>/api.ts` → `hooks.ts` 경유
4. **전역 store 에 서버 데이터 보관** — Redux/Zustand 에 행사·예매를 넣지 않는다. 서버 상태는 Query, 그 외엔 store 자체를 두지 않는다
5. **queryKey 문자열 하드코딩 산재** — `['events']` 를 컴포넌트마다 직접 쓰지 말고 키 팩토리 사용 (무효화 누락·오타 방지)
6. **`onSuccess` 에서 invalidate 누락** — write 후 화면이 안 바뀌는 주범. 캐시 무효화 표를 기준으로 채운다
7. **무한 폴링** — 202 폴링은 terminal status 에서 반드시 중단
8. **파생값을 state·effect 로 동기화** — 렌더 중 계산 또는 `useMemo`
