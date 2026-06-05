# API 연동 표준 (Axios · 토큰 · 폴링)

## 핵심 원칙

> **간략화 우선** — `api` 모듈은 **HTTP 호출만** 한다. 한 함수는 한 엔드포인트만 호출하고, 응답을 그대로 반환한다. 비즈니스 로직·캐시·재시도·로딩 상태는 `api` 가 아니라 TanStack Query 훅 ([03-state-and-data.md](03-state-and-data.md)) 의 책임이다. 컴포넌트가 `axios` 를 직접 부르거나 `fetch` 가 여기저기 흩어지는 것을 막는 게 본 문서의 목표다.

## 레이어 위치

```
component / page
      │  (직접 axios 호출 금지)
      ▼
features/<domain>/hooks.ts     ← TanStack Query 훅 (캐시·상태·폴링) — 03 참조
      │
      ▼
features/<domain>/api.ts       ← 엔드포인트 함수 (HTTP 만)
      │
      ▼
lib/apiClient.ts               ← Axios 인스턴스 + 인터셉터 (토큰·401 갱신)
      │
      ▼
백엔드 FastAPI (http://localhost:8020)
```

| 레이어 | 책임 | 금지 |
|---|---|---|
| `lib/apiClient.ts` | baseURL·헤더·타임아웃, 토큰 주입, 401 refresh | 도메인 지식 (엔드포인트 경로 하드코딩) |
| `features/<domain>/api.ts` | 엔드포인트 함수, 요청/응답 타입 매핑 | 캐시·상태·재시도·UI |
| `features/<domain>/hooks.ts` | Query/Mutation·폴링·무효화 | 직접 `axios` (반드시 api 모듈 경유) |

## Axios 인스턴스 구성

`lib/apiClient.ts` 단 하나의 인스턴스를 모든 도메인이 공유한다. `axios` 를 도메인마다 `import` 하지 않는다.

```ts
// src/lib/apiClient.ts
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8020";
const DEFAULT_TIMEOUT_MS = 10_000;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### 규칙
- **baseURL 은 `VITE_API_BASE_URL` 에서만** — 컴포넌트·api 모듈에 절대경로 하드코딩 금지
- **상수는 UPPER_SNAKE_CASE** — `DEFAULT_TIMEOUT_MS`, `BASE_URL`
- **인스턴스는 단 하나** — 인증 인스턴스/비인증 인스턴스로 쪼개지 않는다. 토큰 주입은 인터셉터가 분기

## 토큰 저장 · 주입

토큰 저장/조회는 한 모듈 (`lib/authToken.ts`) 에 모은다. 컴포넌트가 `localStorage` 를 직접 읽지 않는다.

```ts
// src/lib/authToken.ts
const ACCESS_KEY = "cc.access";
const REFRESH_KEY = "cc.refresh";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
```

> **보안 주의** — 학습 단계에서는 `localStorage` 를 허용하되, XSS 노출 위험을 인지한다. 운영 전환 시 refresh 는 HttpOnly 쿠키로 옮기는 것을 검토 ([04-error-handling.md](04-error-handling.md) 의 보안 항목). 토큰을 컴포넌트 state·전역 store 에 평문으로 복제해 두지 않는다.

## 요청 인터셉터 — access token 주입

```ts
// src/lib/apiClient.ts (계속)
import { getAccessToken } from "@/lib/authToken";

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

- **모든 요청에 자동 주입** — 개별 호출에서 `Authorization` 헤더를 손으로 붙이지 않는다
- **토큰 없으면 헤더 생략** — 공개 엔드포인트 (`/events` 목록 등) 는 토큰 없이도 동작

## 응답 인터셉터 — 401 → refresh 큐잉 → 재시도

401 수신 시 `POST /auth/refresh` 로 새 토큰쌍을 받아 **원요청을 재시도**한다. 동시에 여러 요청이 401 을 받으면 **단일 refresh 만 수행**하고 나머지는 그 결과를 공유(큐잉)한다. refresh 자체가 실패하면 토큰을 비우고 로그인으로 보낸다.

```ts
// src/lib/apiClient.ts (계속)
import type { InternalAxiosRequestConfig } from "axios";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/authToken";
import type { TokenPair } from "@/types/auth";

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<TokenPair> | null = null;

// refresh 는 인터셉터를 안 타는 raw axios 로 호출 (재귀 401 방지)
async function requestRefresh(): Promise<TokenPair> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("no refresh token");
  }
  const { data } = await axios.post<TokenPair>(
    `${BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
  );
  setTokens(data.access_token, data.refresh_token);
  return data;
}

function redirectToLogin(): void {
  clearTokens();
  // 라우터 밖이므로 location 으로 강제 이동 (04 참조)
  window.location.assign("/login");
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // 401 이 아니거나 이미 한 번 재시도한 요청이면 그대로 실패
    if (status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      // 동시 401 들이 단일 refresh 를 공유 (큐잉)
      refreshPromise ??= requestRefresh();
      const tokens = await refreshPromise;
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
      return apiClient(config);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);
```

### 규칙
- **단일 refresh 공유** — `refreshPromise ??= ...` 로 동시 401 폭주 시 refresh 가 1회만 발생
- **`_retried` 플래그** — 재시도한 요청이 또 401 이면 무한 루프 대신 즉시 실패
- **refresh 호출은 raw `axios`** — 인스턴스를 쓰면 인터셉터가 다시 토큰을 붙여 재귀 401 위험
- **refresh 실패 = 로그아웃** — 토큰 clear 후 `/login` 이동. 토큰을 보정하거나 재시도 누적 금지

## 도메인 api 모듈 패턴

각 도메인은 `features/<domain>/api.ts` 에 엔드포인트 함수를 모은다. **객체로 묶어 export** (`eventApi.list/get/...`) 한다. 요청/응답 타입은 `src/types/` (또는 03 의 Zod 스키마) 에서 import 한다.

```ts
// src/features/event/api.ts
import { apiClient } from "@/lib/apiClient";
import type {
  EventCreate,
  EventPage,
  EventRead,
  EventUpdate,
} from "@/types/event";

const BASE = "/events";

export const eventApi = {
  async list(params: { page: number; size: number }): Promise<EventPage> {
    const { data } = await apiClient.get<EventPage>(BASE, { params });
    return data;
  },

  async get(eventId: string): Promise<EventRead> {
    const { data } = await apiClient.get<EventRead>(`${BASE}/${eventId}`);
    return data;
  },

  async create(payload: EventCreate): Promise<EventRead> {
    const { data } = await apiClient.post<EventRead>(BASE, payload);
    return data;
  },

  async update(eventId: string, payload: EventUpdate): Promise<EventRead> {
    const { data } = await apiClient.patch<EventRead>(`${BASE}/${eventId}`, payload);
    return data;
  },

  async remove(eventId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${eventId}`);
  },
};
```

### 규칙
- **함수명은 동작 기준 camelCase** — `list`, `get`, `create`, `update`, `remove` (`delete` 는 예약어라 `remove`)
- **경로 prefix 는 모듈 상단 상수 1곳** — `const BASE = "/events"`. 엔드포인트마다 반복 금지
- **제네릭으로 응답 타입 명시** — `apiClient.get<EventRead>(...)`. 반환 타입도 명시
- **`response.data` 만 반환** — Query 훅이 `AxiosResponse` 래퍼를 알 필요 없음
- **에러는 잡지 않는다** — try/catch 로 삼키지 말 것. 인터셉터(401)와 Query 훅·ErrorBoundary([04](04-error-handling.md))가 처리
- **api 모듈은 React 를 모른다** — `useXxx`·hook·컴포넌트 import 금지

## 엔드포인트 매핑 표

| 도메인 | 메서드 · 경로 | 인증 | 성공 | 응답 타입 |
|---|---|---|---|---|
| auth | `POST /auth/signup` | — | 201 | `UserRead` |
| auth | `POST /auth/login` | — | 200 | `TokenPair` |
| auth | `POST /auth/refresh` | refresh | 200 | `TokenPair` |
| users | `GET /users/me` | ✅ | 200 | `UserRead` |
| events | `GET /events?page&size` | — | 200 | `EventPage` |
| events | `GET /events/{event_id}` | — | 200 | `EventRead` |
| events | `POST /events` | ✅ | 201 | `EventRead` |
| events | `PATCH /events/{event_id}` | ✅ | 200 | `EventRead` |
| events | `DELETE /events/{event_id}` | ✅ | 204 | `void` |
| reservations | `POST /reservations` | ✅ | **202** | `ReservationAccepted` |
| reservations | `DELETE /reservations/{id}` | ✅ | **202** | `ReservationAccepted` |
| reservations | `GET /reservations?page&size` | ✅ | 200 | `ReservationPage` |
| reservations | `GET /reservations/{id}` | ✅ | 200 | `ReservationRead` |
| payments | `POST /payments` | ✅ | **202** | `PaymentAccepted` |
| payments | `GET /payments?page&size` | ✅ | 200 | `PaymentPage` |
| payments | `GET /payments/{id}` | ✅ | 200 | `PaymentRead` |

> **202 표시 행이 비동기 write** — 즉시 식별자만 돌려받고 실제 반영은 폴링으로 확인한다 (아래 참조).

### 주요 타입 정의

```ts
// src/types/auth.ts
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
}

// src/types/user.ts
export interface UserRead {
  user_id: string; // uuid
  user_name: string;
  created_at: string;
}

// src/types/event.ts
export interface EventSchedule {
  start_at: string;
  end_at: string;
}

export interface EventRead {
  event_id: string;
  user_id: string;
  title: string; // ≤ 20
  body?: string;
  schedule: EventSchedule;
  img_urls: string[];
  total_seats: number;
  created_at: string; // date
  last_modified?: string;
}

export interface EventPage {
  items: EventRead[];
  total: number;
  page: number;
  size: number;
}

// src/types/reservation.ts
export interface ReservationAccepted {
  reservation_id: string;
  status: "accepted";
}

export interface ReservationRead {
  reservation_id: string;
  user_id: string;
  event_id: string;
  is_canceled: boolean;
  reserved_num: number;
  created_at: string;
  last_modified?: string;
}

// src/types/payment.ts
export interface PaymentAccepted {
  payment_history_id: string;
  status: "accepted";
}

export interface PaymentRead {
  payment_history_id: string;
  user_id: string;
  reservation_id: string;
  payment_method: string; // 1~20자
  created_at: string;
}
```

> `EventPage` 와 동일한 형태로 `ReservationPage` / `PaymentPage` (`{ items, total, page, size }`) 를 정의한다. 페이지 래퍼가 반복되므로 `types/common.ts` 에 `Page<T>` 제네릭으로 추출해도 좋다.

```ts
// src/types/common.ts
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
```

## 비동기 202 write — 폴링 패턴 (핵심)

예매·결제의 `POST`/`DELETE` 는 **`202 Accepted` + 식별자**만 즉시 반환한다. 실제 처리는 백엔드의 SQS→Lambda 가 비동기로 수행하므로, 클라이언트는 **반환된 id 로 단건 GET 을 폴링**해 결과가 반영됐는지 확인한다. (조회 GET 들은 모두 동기다.)

### 흐름

```
1) POST /reservations { event_id, reserved_num }  → 202 { reservation_id, status: "accepted" }
2) 반환된 reservation_id 로 GET /reservations/{id} 폴링
3) 200 으로 ReservationRead 가 안정적으로 조회되면 "반영 완료"
4) 취소도 동일: DELETE → 202 → GET 으로 is_canceled=true 확인
```

### 저수준 폴링 헬퍼

`api` 모듈은 단건 GET 만 제공하고, **폴링 자체는 `lib/poll.ts` 의 범용 헬퍼**로 둔다. 최대 시도·간격(고정 또는 백오프)·타임아웃을 명시한다.

```ts
// src/lib/poll.ts
export interface PollOptions {
  maxAttempts?: number;   // 최대 시도 횟수
  intervalMs?: number;    // 기본 간격
  backoff?: boolean;      // true 면 시도마다 간격 증가 (지수)
  maxIntervalMs?: number; // 백오프 상한
}

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_INTERVAL_MS = 1_000;
const DEFAULT_MAX_INTERVAL_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** done(result) 가 true 가 될 때까지 fetcher 를 재시도. 타임아웃 시 throw. */
export async function pollUntil<T>(
  fetcher: () => Promise<T>,
  done: (value: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseInterval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxInterval = options.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const value = await fetcher();
    if (done(value)) {
      return value;
    }
    const delay = options.backoff
      ? Math.min(maxInterval, baseInterval * 2 ** attempt)
      : baseInterval;
    await sleep(delay);
  }
  throw new Error("polling timed out");
}
```

### 도메인 api 에서의 사용

```ts
// src/features/reservation/api.ts
import { apiClient } from "@/lib/apiClient";
import { pollUntil } from "@/lib/poll";
import type {
  ReservationAccepted,
  ReservationRead,
} from "@/types/reservation";

const BASE = "/reservations";

export const reservationApi = {
  async create(payload: { event_id: string; reserved_num: number }): Promise<ReservationAccepted> {
    const { data } = await apiClient.post<ReservationAccepted>(BASE, payload);
    return data; // 202: { reservation_id, status: "accepted" }
  },

  async get(reservationId: string): Promise<ReservationRead> {
    const { data } = await apiClient.get<ReservationRead>(`${BASE}/${reservationId}`);
    return data;
  },

  /** 202 식별자로 생성 반영까지 폴링 */
  async waitForCreated(reservationId: string): Promise<ReservationRead> {
    return pollUntil(
      () => this.get(reservationId),
      (reservation) => !reservation.is_canceled,
      { maxAttempts: 10, intervalMs: 1_000, backoff: true },
    );
  },
};
```

### TanStack Query 연동 (개요)

훅 레이어에서는 **두 가지 방식 중 하나**를 쓴다. 상세 패턴은 [03-state-and-data.md](03-state-and-data.md), 폴링 비용·UX 는 [09-performance.md](09-performance.md) 참조.

- **mutation 내부 폴링** — `useMutation` 의 `mutationFn` 이 `create` → `waitForCreated` 까지 한 번에 수행. 호출부는 "완료"만 받는다.
- **query refetchInterval** — 생성 직후 단건 `useReservation(id)` 쿼리를 띄우고, 미반영 상태면 `refetchInterval` 로 폴링, 반영되면 `false` 반환해 폴링 중단.

```ts
// refetchInterval 개요 (상세는 03)
useQuery({
  queryKey: ["reservation", reservationId],
  queryFn: () => reservationApi.get(reservationId),
  refetchInterval: (query) =>
    query.state.data && !query.state.data.is_canceled ? false : 1_000,
});
```

### 규칙
- **반드시 종료 조건** — `maxAttempts` + 타임아웃 throw. 무한 폴링 금지
- **백오프 권장** — 스파이크 시 폴링이 백엔드를 다시 때리지 않도록 (`backoff: true`)
- **202 응답을 "성공 화면"으로 쓰지 않는다** — "요청 접수됨 / 처리 중" 으로 표시하고, 폴링 완료 후 "완료" 로 전환 ([08-design-system.md](08-design-system.md) 의 비동기 상태 가시화)
- **폴링 타임아웃은 에러가 아닌 '지연'** — 사용자에게 "처리가 지연되고 있습니다, 잠시 후 새로고침" 안내. 결제·예매 자체가 실패한 것은 아닐 수 있음

## 페이지네이션

목록 엔드포인트는 모두 `page` · `size` 쿼리 파라미터를 받고 `{ items, total, page, size }` 형태로 응답한다.

| 파라미터 | 규칙 |
|---|---|
| `page` | **1-based** (0 아님) |
| `size` | 기본 20, 최대 100 |

```ts
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function normalizePageParams(page?: number, size?: number) {
  return {
    page: Math.max(DEFAULT_PAGE, page ?? DEFAULT_PAGE),
    size: Math.min(MAX_PAGE_SIZE, size ?? DEFAULT_PAGE_SIZE),
  };
}
```

### 규칙
- **page 는 1부터** — UI 페이지 번호와 그대로 매핑
- **size 상한 100 클램프** — 서버도 검증하지만 클라이언트에서 먼저 보정
- **`total` 로 마지막 페이지 계산** — `Math.ceil(total / size)`
- **무한 스크롤이 필요하면 `useInfiniteQuery`** — `getNextPageParam` 에서 `page * size < total` 로 다음 페이지 판단 ([03](03-state-and-data.md))

## 표준 에러 응답

모든 에러는 `{ code, message, details }` 형태다. api 모듈은 에러를 잡지 않고 흘려보내며, 해석·표시는 [04-error-handling.md](04-error-handling.md) 가 담당한다. 여기서는 형태와 코드 매핑만 정리한다.

```ts
// src/types/error.ts
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

| 상태 | 의미 | 클라이언트 기본 처리 |
|---|---|---|
| 401 | 인증 만료/실패 | 인터셉터가 refresh → 재시도, 실패 시 로그인 이동 |
| 404 | 리소스 없음 | "없는 항목" 빈 상태 / 상세 페이지 not-found |
| 409 | 좌석 선점 충돌 | "이미 선점됨" 안내, 목록 갱신 유도 |
| 422 | 검증 실패 | 폼 필드 에러로 매핑 (Zod 메시지와 병합) |
| 503 | 백프레셔 | `Retry-After` 만큼 대기 후 재시도 안내 (지수 백오프) |

```ts
// 응답 본문에서 표준 에러 추출 (04 에서 ErrorBoundary·toast 가 사용)
import { AxiosError } from "axios";
import type { ApiError } from "@/types/error";

export function toApiError(error: unknown): ApiError | null {
  if (error instanceof AxiosError && error.response?.data) {
    return error.response.data as ApiError;
  }
  return null;
}
```

> **503 의 `Retry-After`** — 백엔드 백프레셔 신호다. 자동 무한 재시도 금지. 폴링/재시도 시 `error.response.headers["retry-after"]` 를 존중하고, 없으면 1~3초 랜덤 백오프 ([09-performance.md](09-performance.md) 의 스파이크 UX).

## 타입 정의 규칙

- **API 응답 타입은 명시** — `apiClient.get<T>()` 의 `T` 를 항상 지정. `any`·암묵 `unknown` 금지
- **응답을 무조건 신뢰하지 않는다** — 타입은 컴파일 타임 약속일 뿐 런타임 보장이 아니다. **사용자 입력(폼)은 Zod 로 런타임 검증**한다 ([03-state-and-data.md](03-state-and-data.md))
- **서버 응답까지 Zod 로 파싱하는 것은 선택** — 본 프로젝트 규모에선 폼 입력 Zod + 응답 TS 인터페이스로 충분. 응답 스키마가 자주 깨지면 그때 `safeParse` 도입
- **타입은 `src/types/<domain>.ts` 에** — api 모듈은 정의가 아니라 import 만. 네이밍은 백엔드 스키마와 일치 (`EventRead`, `TokenPair`, snake_case 필드)
- **날짜·uuid 도 `string`** — 백엔드가 ISO 문자열/uuid 문자열로 주므로 `Date` 로 강제 변환하지 않는다. 표시 시점에만 포맷

## 안티 패턴

### 금지
- **컴포넌트에서 `axios` 직접 호출** — 반드시 `features/<domain>/api.ts` → 훅 경유
- **`fetch` 산재** — 프로젝트 HTTP 는 `apiClient` 단일 경로. `fetch` 직접 사용 금지
- **api 모듈에서 try/catch 로 에러 삼키기** — 에러는 흘려보내고 04 가 처리. `return null` 로 실패를 감추지 말 것
- **응답을 `any` 로 받기** — `apiClient.get<EventRead>()` 처럼 제네릭 명시
- **개별 호출에 `Authorization` 헤더 수동 부착** — 요청 인터셉터가 일괄 주입
- **401 마다 각자 refresh** — 단일 `refreshPromise` 공유. 다중 refresh 는 토큰 레이스 유발
- **refresh 를 `apiClient` 로 호출** — 인터셉터 재귀. raw `axios` 사용
- **202 응답을 "완료"로 단정** — 반드시 단건 GET 폴링으로 반영 확인
- **종료 조건 없는 폴링·무한 재시도** — `maxAttempts`·타임아웃·백오프 명시. 503 의 `Retry-After` 무시 금지
- **base URL 하드코딩** — `http://localhost:8020` 을 코드에 직접 적지 않고 `VITE_API_BASE_URL` 사용
- **토큰을 컴포넌트 state·전역 store 에 평문 복제** — 저장은 `lib/authToken.ts` 한 곳
