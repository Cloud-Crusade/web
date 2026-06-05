# 에러 처리 · 상태 표시

## 핵심 원칙

> **간략화 우선** — 에러 경계·매핑·상태 표시는 **실제로 발생하고 사용자가 다르게 반응해야 하는 케이스만** 다룬다. "혹시 모르니" try/catch 로 모든 호출을 감싸지 않는다 — 렌더 에러는 ErrorBoundary, API 에러는 TanStack Query 가 잡는다. 에러를 삼켜 빈 화면을 만들지 않고, 항상 사용자에게 보이는 피드백을 남긴다.

## 에러 처리 원칙

1. **fail-visible** — 잡았으면 반드시 UI 로 노출. `catch` 후 `console.log` 만 하고 끝내지 않는다
2. **경계가 잡는다** — 렌더 에러는 ErrorBoundary, 비동기 데이터 에러는 Query/Mutation 이 책임. 컴포넌트마다 try/catch 박지 않는다
3. **사용자 메시지는 한국어** — 기술 용어·스택트레이스·`code` 문자열 노출 금지. `message` 필드를 그대로 보여준다
4. **`code` 는 내부 분기에만** — `SEAT_ALREADY_TAKEN` 같은 코드는 if 분기·로깅에만 쓰고 화면에 띄우지 않는다
5. **인라인 우선, 토스트는 보조** — 폼 필드 에러는 필드 밑에, 전역 실패만 토스트

## 에러 분류

| 분류 | 발생 위치 | 잡는 곳 | 표시 방식 |
|---|---|---|---|
| **렌더링 에러** | 컴포넌트 렌더 중 throw (undefined 접근 등) | `ErrorBoundary` / route `errorElement` | 폴백 UI + 새로고침/홈 이동 |
| **API 에러** | Query/Mutation 의 HTTP 실패 | `isError` 분기 + 전역 `QueryCache`/`MutationCache` | 인라인 재시도 UI / 토스트 |
| **폼 검증 에러** | 제출 전(클라 Zod) · 제출 후(서버 422) | RHF resolver · `setError` | 필드별 인라인 메시지 |
| **네트워크/오프라인** | 요청 자체 실패 (`ERR_NETWORK`) | Axios 에러 (`response` 없음) | "네트워크 확인" 토스트 + 재시도 |

> API 연동·인터셉터·202 폴링의 기반은 [02-api-integration.md](02-api-integration.md), Query 훅·캐시 무효화·폼 구성은 [03-state-and-data.md](03-state-and-data.md) 를 따른다. 본 문서는 그 위에서 **실패 경로** 만 다룬다.

## API 에러 표준 형태

백엔드는 모든 에러를 동일한 3 필드로 반환한다 (`cc/app` 의 글로벌 핸들러).

```json
{
  "code": "SEAT_ALREADY_TAKEN",
  "message": "이미 선점된 좌석입니다",
  "details": { "event_id": 42, "seat_no": "A-12" }
}
```

### 타입 정의

```typescript
// src/lib/api/errors.ts
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** 422 검증 에러의 details 항목 (필드별 에러) */
export interface FieldIssue {
  field: string;   // 예: "email", "password"
  message: string; // 예: "이메일 형식이 아닙니다"
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
  }
}
```

### Axios 에러 → ApiError 추출 헬퍼

응답 인터셉터에서 한 번만 변환해, 이후 모든 코드가 `ApiError` 단일 타입으로 분기한다.

```typescript
// src/lib/api/errors.ts
import { AxiosError, isAxiosError } from "axios";

const NETWORK_ERROR: ApiErrorBody = {
  code: "NETWORK_ERROR",
  message: "네트워크 연결을 확인해 주세요",
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiErrorBody>>;
    const status = axiosError.response?.status ?? 0;
    const body = axiosError.response?.data;

    // response 가 없으면 네트워크/오프라인/타임아웃
    if (status === 0 || !body?.code) {
      return new ApiError(status, NETWORK_ERROR);
    }
    return new ApiError(status, {
      code: body.code,
      message: body.message ?? "요청을 처리하지 못했습니다",
      details: body.details,
    });
  }

  return new ApiError(0, { code: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다" });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
```

> 인터셉터에서 `Promise.reject(toApiError(error))` 로 변환하면([02-api-integration.md](02-api-integration.md)), Query/Mutation 의 `error` 는 항상 `ApiError` 다. 컴포넌트에서 `as any` 캐스팅 금지.

## 상태코드 → UI 처리 매핑

`ApiError.status` 와 `ApiError.code` 를 기준으로 처리 방침을 통일한다.

| status | code (예) | UI 처리 방침 |
|---|---|---|
| **401** | `INVALID_TOKEN` · `INVALID_CREDENTIALS` | 인터셉터가 `/auth/refresh` 자동 시도 → 성공 시 원요청 재시도 / 실패 시 인증 컨텍스트 초기화 + `/login` 리다이렉트. 로그인 화면 자체의 401 은 폼 에러로 표시 |
| **404** | `EVENT_NOT_FOUND` · `RESERVATION_NOT_FOUND` | 빈 상태(EmptyState) 표시 + 목록으로 복귀 버튼. "본인 것 아님" 도 404 로 오므로 동일 처리 |
| **409** | `SEAT_ALREADY_TAKEN` | 좌석 영역에 인라인 경고 + 좌석/잔여 쿼리 무효화(refetch)로 최신 상태 갱신. 다른 좌석 선택 유도 |
| **422** | `VALIDATION_ERROR` | `details` 를 폼 필드별 에러로 매핑(`setError`). 토스트 띄우지 않음 |
| **503** | `BACKPRESSURE` 등 | `Retry-After` 헤더 존중. "잠시 후 다시 시도해 주세요" 안내 + (가능하면) 자동 재시도 카운트다운. 백프레셔는 정상 동작이므로 에러로 단정하지 않는다 |
| **5xx (기타)** | `INTERNAL_ERROR` | "일시적 오류" 토스트 + 재시도 버튼. 상세는 노출하지 않음 |

### 분기 헬퍼

```typescript
// src/lib/api/errors.ts
export const isUnauthorized = (e: ApiError) => e.status === 401;
export const isNotFound = (e: ApiError) => e.status === 404;
export const isSeatTaken = (e: ApiError) => e.code === "SEAT_ALREADY_TAKEN";
export const isValidationError = (e: ApiError) => e.status === 422;
export const isBackpressure = (e: ApiError) => e.status === 503;
export const isRetryable = (e: ApiError) =>
  e.status === 503 || e.status === 0; // 백프레셔·네트워크는 재시도 의미 있음
```

## 렌더링 에러 — ErrorBoundary

렌더 중 throw 된 예외는 React 가 트리를 언마운트시킨다. 폴백 UI 로 빈 화면을 막는다.

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // 렌더 에러는 운영 중 추적이 필요 — 콘솔만 두지 말고 추후 Sentry 등으로 교체
    console.error("render_error", error);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium">문제가 발생했어요</p>
        <p className="text-muted-foreground">페이지를 다시 불러와 주세요.</p>
        <Button onClick={() => window.location.reload()}>새로고침</Button>
      </div>
    );
  }
}
```

### route 레벨 errorElement

React Router 의 라우트 단위 폴백으로 라우터 로더/액션 에러도 잡는다.

```tsx
// src/routes/RouteError.tsx
import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? "요청한 페이지를 찾을 수 없어요"
    : "페이지를 표시하는 중 오류가 발생했어요";

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-lg font-medium">{message}</p>
      <Button asChild>
        <Link to="/">홈으로</Link>
      </Button>
    </div>
  );
}

// router 정의
// { path: "/events/:eventId", element: <EventDetailPage />, errorElement: <RouteError /> }
```

### 규칙
- **앱 루트 + 주요 라우트에 ErrorBoundary** — 전체를 한 번, 위험한 서브트리(좌석맵 등)는 추가로 감싼다
- **ErrorBoundary 는 렌더 에러 전용** — 비동기 데이터 에러는 Query 의 `isError` 로. 둘을 섞지 않는다
- **폴백은 항상 탈출구 제공** — 새로고침 또는 홈 이동 버튼

## TanStack Query 전역 에러 처리

### Mutation 은 전역 토스트, Query 는 컴포넌트 분기

읽기(Query) 실패는 화면에 인라인 표시(재시도 버튼)가 자연스럽고, 쓰기(Mutation) 실패는 전역 토스트가 적절하다. `QueryCache`/`MutationCache` 의 `onError` 로 공통 처리한다.

```tsx
// src/lib/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { toApiError, isUnauthorized, isValidationError } from "@/lib/api/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const e = toApiError(error);
        // 4xx 는 재시도 무의미. 503/네트워크만 제한 재시도
        if (e.status >= 400 && e.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
  // 조회 실패는 보통 컴포넌트에서 인라인 처리 → 전역 토스트는 띄우지 않음
  queryCache: new QueryCache({
    onError: (error) => {
      const e = toApiError(error);
      if (isUnauthorized(e)) return; // 401 은 인터셉터가 처리
    },
  }),
  // 쓰기 실패는 전역 토스트 (단, 401·422 는 각 화면이 처리)
  mutationCache: new MutationCache({
    onError: (error) => {
      const e = toApiError(error);
      if (isUnauthorized(e) || isValidationError(e)) return;
      toast.error(e.message);
    },
  }),
});
```

> `onError` 가 전역으로 토스트를 띄우므로, 개별 `useMutation` 에서 같은 에러를 또 토스트하지 않는다(중복 토스트 금지). 필드 매핑(422)·인라인 경고(409)만 컴포넌트에서 추가한다.

## 로딩 / 빈 / 에러 3종 상태 패턴

목록·단건 조회는 항상 세 상태를 명시적으로 분기한다. 하나라도 빠지면 빈 화면·무한 스피너가 생긴다.

### 목록 조회

```tsx
// src/features/event/EventList.tsx
import { useEvents } from "@/features/event/useEvents";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { QueryErrorState } from "@/components/QueryErrorState";

export function EventList() {
  const { data, isLoading, isError, error, refetch } = useEvents();

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <QueryErrorState error={error} onRetry={refetch} />;
  }

  if (data.items.length === 0) {
    return <EmptyState title="등록된 행사가 없어요" />;
  }

  return (
    <ul className="grid gap-4">
      {data.items.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </ul>
  );
}
```

### 공통 에러 상태 컴포넌트

```tsx
// src/components/QueryErrorState.tsx
import { toApiError, isNotFound } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

interface Props {
  error: unknown;
  onRetry: () => void;
}

export function QueryErrorState({ error, onRetry }: Props) {
  const e = toApiError(error);

  // 404 는 에러가 아니라 빈 상태로 — "없음 / 본인 것 아님"
  if (isNotFound(e)) {
    return <EmptyState title="찾을 수 없는 항목이에요" />;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-muted-foreground">{e.message}</p>
      <Button variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
```

### 규칙
- **`isLoading` → Skeleton** — 레이아웃 시프트를 줄이도록 실제 카드 형태와 유사하게
- **`isError` → 재시도 버튼** — `refetch` 연결. 404 는 빈 상태로 강등
- **empty → EmptyState** — `data` 가 비었을 때. 로딩/에러와 분리된 별도 분기
- **단건 조회도 동일 3종** — 다만 404 는 "목록으로" 버튼이 있는 EmptyState

## 폼 에러 — 클라 Zod + 서버 422

### 클라이언트 즉시 검증

RHF + Zod resolver 로 제출 전 형식 오류를 필드 밑에 즉시 표시한다([03-state-and-data.md](03-state-and-data.md)).

```tsx
// src/features/auth/useSignupForm.ts
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.string().email("이메일 형식이 아니에요"),
  password: z.string().min(8, "8자 이상 입력해 주세요"),
});

export type SignupValues = z.infer<typeof schema>;

export function useSignupForm() {
  return useForm<SignupValues>({ resolver: zodResolver(schema) });
}
```

### 서버 422 details → setError 필드 매핑

클라 검증을 통과해도 서버가 422 를 줄 수 있다(중복 이메일 등). `details` 를 필드 에러로 되돌린다.

```tsx
// src/features/auth/SignupForm.tsx
import { toApiError, isValidationError, type FieldIssue } from "@/lib/api/errors";

export function SignupForm() {
  const form = useSignupForm();
  const signup = useSignupMutation();

  const onSubmit = form.handleSubmit((values) => {
    signup.mutate(values, {
      onError: (error) => {
        const e = toApiError(error);
        if (!isValidationError(e)) return; // 422 외엔 전역 토스트가 처리

        const issues = (e.details.fields as FieldIssue[] | undefined) ?? [];
        for (const issue of issues) {
          // 알 수 없는 필드면 폼 전역 에러로
          form.setError(issue.field as keyof SignupValues, {
            type: "server",
            message: issue.message,
          });
        }
      },
    });
  });

  return (
    <form onSubmit={onSubmit}>
      {/* 필드 + form.formState.errors[field]?.message 표시 */}
    </form>
  );
}
```

### 규칙
- **폼 에러는 토스트 금지** — 항상 필드 밑 인라인. 어떤 필드가 틀렸는지 보여야 한다
- **서버 422 매핑 우선** — `details.fields` 형태를 `setError` 로. 백엔드 `details` 구조와 키를 [02-api-integration.md](02-api-integration.md) 에서 합의
- **제출 중 비활성화** — `isPending` 동안 submit 버튼 disable (중복 제출 방지)

## 401 흐름 — 자동 refresh → 최종 실패 리다이렉트

```
요청 → 401
  │
  ├─ access 만료로 추정 → 인터셉터가 /auth/refresh 호출
  │     ├─ 성공 → 새 access 저장 → 원래 요청 재시도(1회)
  │     └─ 실패(refresh 만료/무효) → 인증 컨텍스트 초기화 → /login 리다이렉트
  │
  └─ 동시 다발 401 → refresh 는 단일 in-flight 로 큐잉 (중복 갱신 방지)
```

- 인터셉터 구현(refresh 큐잉·재시도 1회 제한)은 [02-api-integration.md](02-api-integration.md) 가 단일 출처
- **최종 실패 시 처리는 본 문서 책임**: 인증 컨텍스트(토큰·유저) 초기화 → `/login?redirect=<현재경로>` 로 이동
- **로그인 화면의 401 은 예외** — refresh 시도 없이 `INVALID_CREDENTIALS` 를 폼 에러로 표시
- 라우트 가드(미인증 시 보호 라우트 차단)는 [01-architecture.md](01-architecture.md) 참조

```tsx
// src/features/auth/authEvents.ts — 인터셉터가 최종 실패 시 호출
export function onAuthExpired() {
  queryClient.clear();          // 캐시된 보호 리소스 폐기
  authStore.reset();            // 토큰·유저 초기화
  const redirect = encodeURIComponent(location.pathname + location.search);
  location.assign(`/login?redirect=${redirect}`);
}
```

## 비동기 202 실패 처리

예매·결제 생성/취소는 `202 Accepted` + 식별자만 즉시 받고, 단건 조회 폴링으로 반영을 확인한다([02-api-integration.md](02-api-integration.md)). 폴링은 **무한이 아니다** — 타임아웃·취소 분기로 사용자에게 결과를 알린다.

```tsx
// src/features/reservation/useReservationStatus.ts
import { useQuery } from "@tanstack/react-query";
import { getReservation } from "@/lib/api/reservations";

const POLL_INTERVAL = 1_000;
const POLL_TIMEOUT = 15_000; // 이 시간까지 확정 안 되면 타임아웃 안내

export function useReservationStatus(reservationId: string, startedAt: number) {
  return useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => getReservation(reservationId),
    refetchInterval: (query) => {
      const data = query.state.data;
      // 처리 완료(확정/취소반영) 시 폴링 중단
      if (data && data.status !== "pending") return false;
      // 타임아웃 — 폴링 중단(아래 UI 에서 안내)
      if (Date.now() - startedAt > POLL_TIMEOUT) return false;
      return POLL_INTERVAL;
    },
  });
}
```

```tsx
// 소비 컴포넌트 — 3가지 종료 상태 안내
const { data } = useReservationStatus(id, startedAt);
const timedOut = data?.status === "pending" && Date.now() - startedAt > POLL_TIMEOUT;

if (data?.is_canceled) return <p>예매가 취소되었어요.</p>;
if (data?.status === "confirmed") return <ReservationConfirmed reservation={data} />;
if (timedOut) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p>처리가 지연되고 있어요. 잠시 후 예매 내역에서 확인해 주세요.</p>
      <Button asChild variant="outline"><Link to="/reservations">예매 내역</Link></Button>
    </div>
  );
}
```

### 규칙
- **폴링은 반드시 종료 조건** — 완료 상태 도달 또는 타임아웃. 무한 폴링 금지(서버 부하·배터리)
- **`is_canceled` / 타임아웃 / 완료** 3 종을 모두 분기해 사용자 피드백
- **타임아웃은 실패 단정 금지** — "지연 중, 내역에서 확인" 으로 안내(비동기라 나중에 반영될 수 있음)
- **백프레셔 503 으로 생성 자체 실패** 시엔 폴링 시작 전에 재시도 안내(아래 토스트 정책)

## 토스트 정책 (shadcn Sonner)

| 상황 | 토스트? | 비고 |
|---|---|---|
| Mutation 성공(생성·취소 접수) | ✅ `toast.success` | "예매 요청이 접수되었어요" 등 한국어 |
| Mutation 실패(전역) | ✅ `toast.error(e.message)` | `MutationCache.onError` 가 일괄 처리 |
| 폼 필드 검증 에러(422/Zod) | ❌ | 필드 인라인으로 |
| 좌석 선점 409 | ❌(인라인 경고) | 좌석 영역 경고 + 목록 갱신 |
| 503 백프레셔 | ✅ | "잠시 후 다시 시도해 주세요" + Retry-After 반영 |
| 조회(Query) 실패 | ❌(인라인 재시도) | `QueryErrorState` 로 |

```tsx
// 성공 토스트 예시
toast.success("예매 요청이 접수되었어요. 처리 결과를 확인 중이에요.");
```

### 규칙
- **`message` 필드를 그대로 노출** — 백엔드 한국어 메시지가 사용자 메시지의 단일 출처
- **과용 금지** — 한 동작에 토스트 1개. 전역 `onError` 와 컴포넌트에서 이중 토스트 금지
- **인라인이 가능하면 인라인** — 폼·좌석처럼 위치가 명확한 에러는 토스트보다 인라인이 우선

## 사용자 메시지 원칙

- **한국어 단일** — 모든 사용자 노출 메시지는 한국어
- **기술 용어·내부 코드 노출 금지** — `SEAT_ALREADY_TAKEN`, `422`, 스택트레이스, URL 을 화면에 띄우지 않는다
- **`code` 는 분기·로깅 전용** — `if (e.code === "SEAT_ALREADY_TAKEN")` 는 OK, 화면 텍스트로는 `e.message`
- **실패에 탈출구 제공** — 재시도·목록 복귀·새로고침 중 하나는 항상 제공
- **모호한 문구 금지** — "오류 발생" 단독 금지. 무엇을, 다음에 무엇을 할지 짧게

## 안티 패턴

### 금지
- **`catch` 후 빈 화면** — 잡았으면 폴백 UI 또는 토스트로 반드시 노출. 삼키지 않는다
- **`console.log`/`console.error` 만 하고 UI 무반응** — 콘솔은 보조, 화면 피드백이 본체
- **`alert()` / `confirm()` 사용** — shadcn Toast(Sonner)·Dialog 사용
- **모든 에러를 토스트** — 폼·좌석·조회 에러는 인라인. 토스트는 전역 실패만
- **무한 스피너** — `isError`/empty 분기 누락. 3종 상태 항상 명시
- **무한 폴링** — 202 폴링에 타임아웃·완료 종료 조건 없음
- **`error as any` / `(error as AxiosError).response.data.message`** — `toApiError(error)` 로 정규화 후 `ApiError` 로 분기. `any` 캐스팅 금지
- **`code` 문자열을 사용자에게 노출** — 내부 분기·로깅에만
- **컴포넌트마다 try/catch 로 fetch 감싸기** — Query/Mutation 의 `isError`/`onError` 사용
- **전역 `onError` + 컴포넌트 `onError` 이중 토스트** — 한 동작에 한 번만
- **401 을 화면마다 개별 처리** — 인터셉터의 refresh→리다이렉트 단일 흐름에 위임(로그인 화면만 예외)
