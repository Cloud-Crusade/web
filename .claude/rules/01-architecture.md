# 아키텍처 및 디렉토리 구조

## 핵심 원칙

> **간략화 우선** — 본 문서의 모든 구조는 학습·실습 규모의 티켓팅 웹앱에 맞춰 **최소한**으로 정의된다. 엔터프라이즈 SPA 패턴(전역 상태 머신·DDD 프론트엔드·BFF·마이크로 프론트엔드 등)을 임의로 도입하지 않는다. 새 레이어·라이브러리가 필요해 보이면 먼저 [README.md 의 "간략화 원칙"](README.md#프로젝트-성격--간략화-원칙-필독) 을 다시 읽는다.

## 시스템 개요

- **프로젝트**: 티켓팅 서비스 웹 프론트엔드 (팀 C.C — Cloud Crusade)
- **형태**: **단일 페이지 애플리케이션(SPA)** — Vite + React + TypeScript
- **역할**: 백엔드 [`cc/app`](../../../app/.claude/rules/README.md) 의 FastAPI API 를 소비. 자체 서버·DB 없음 (정적 자산으로 빌드/배포)
- **기능 범위**: 인증 + 행사 관리 + 티켓팅(예매/결제) — 그 외 기능 없음 (자세한 범위는 [README.md](README.md))
- **소비하는 도메인 4개**: `auth/users` · `events` · `reservations` · `payments`
- **인증**: JWT (access 30분 + refresh 14일), `Authorization: Bearer`

### 백엔드 연동 단일 사실

| 항목 | 값 |
|---|---|
| API base URL | `http://localhost:8020` (env `VITE_API_BASE_URL`) |
| API 문서 | Swagger `/docs` |
| 인증 | access 30분 + refresh 14일, 401 시 `/auth/refresh` 자동 갱신 후 재시도 |
| 비동기 write | `reservations`·`payments` 의 POST/DELETE 는 `202 Accepted {id, status:"accepted"}` 반환 (SQS→Lambda) → 반환 `id` 로 단건 조회 폴링 |
| 동기 read | 조회(GET)는 즉시 응답 |
| 표준 에러 | `{ code, message, details }` (401/404/409/422/503 — 503 은 백프레셔, `Retry-After` 동반) |

> API 연동의 상세(인터셉터·토큰 갱신·202 폴링)는 [02-api-integration.md](02-api-integration.md), 에러 매핑은 [04-error-handling.md](04-error-handling.md) 참조.

### 프론트엔드 특성

- **권한 분리 없음** — 백엔드에 역할(role) 구분이 없으므로 화면도 관리자/사용자를 나누지 않는다. 인증 여부(로그인/비로그인)만 구분
- **화면 = API 범위** — 백엔드가 노출하지 않는 기능은 어떤 형태로도 화면을 만들지 않는다
- **비동기 write 가시화** — 예매·결제는 즉시 완료되지 않는다(202). "처리 중 → 완료/실패" 상태를 UI 가 명확히 노출하는 것이 핵심 ([03-state-and-data.md](03-state-and-data.md))

## 아키텍처 레이어

백엔드의 `router → service → repository → model` 단방향 흐름을 프론트엔드 SPA 의 레이어로 치환한다.

```
┌──────────────────────────────────────────────┐
│  pages/  ·  routes/                            │  ← 라우트 단위 화면, 레이아웃·조합, 보호 라우트
├──────────────────────────────────────────────┤
│  features/<domain>/                            │
│    hooks.ts   ← TanStack Query 훅 (데이터·로직)  │
│    api.ts     ← Axios 호출 (HTTP)               │
│    schema.ts  ← Zod 스키마 (폼·응답 검증)         │
│    components ← 도메인 UI                        │
├──────────────────────────────────────────────┤
│  lib/                                          │  ← apiClient(Axios), queryClient, utils
├──────────────────────────────────────────────┤
│  백엔드 cc/app API (http://localhost:8020)       │
└──────────────────────────────────────────────┘
```

### 레이어별 책임

| 레이어 | 책임 | 금지 |
|---|---|---|
| `pages` / `routes` | 라우트 연결, 레이아웃, feature 컴포넌트·훅 조합, 로딩/에러 상태 배치 | 직접 Axios 호출, 비즈니스 로직, 도메인 스키마 정의 |
| `features/*/hooks` | TanStack Query `useQuery`/`useMutation`, 캐시 키·무효화, 202 폴링 로직 | JSX 렌더링, `import.meta.env` 직접 접근, Axios 인스턴스 직접 생성 |
| `features/*/api` | 엔드포인트별 HTTP 호출, 요청/응답 타입, 응답 Zod 파싱 | React 훅 사용, 캐시 관리, 컴포넌트 import |
| `features/*/schema` | Zod 스키마(폼 입력·응답 형태), 파생 타입(`z.infer`) | HTTP 호출, 컴포넌트 의존 |
| `features/*/components` | 도메인 UI 렌더링, 훅 구독, 폼 표현 | `apiClient` 직접 호출(반드시 훅 경유), 라우팅 결정 |
| `lib` | `apiClient`(Axios 인스턴스+인터셉터), `queryClient`, 순수 util | 도메인 지식, 특정 엔티티 이름 |

### 의존성 방향

- **단방향**: `pages → features(hooks → api → schema) → lib → 서버`
- **역방향 import 금지** — `lib` 가 `features` 를, `features/api` 가 `features/components` 를 import 하면 즉시 잘못된 설계
- **컴포넌트는 fetch 하지 않는다** — 데이터는 항상 feature 훅을 통해 받는다 (`useEvents()`, `useCreateReservation()` 등). 컴포넌트 안에서 `apiClient.get(...)` 직접 호출 금지
- **도메인 간 협력은 page 레벨에서** — 한 화면이 `events` 와 `reservations` 두 도메인 데이터를 함께 쓰면, 각 feature 훅을 page 가 조합한다. feature 가 다른 feature 의 `api.ts` 를 import 하지 않는다 (백엔드의 "service 끼리 import 금지" 와 동일 정신)

## 디렉토리 구조

```
src/
├── main.tsx                 # 엔트리. Provider 구성 (QueryClientProvider, RouterProvider)
├── App.tsx                  # 라우트 정의 (또는 routes/ 로 위임)
│
├── lib/                     # 도메인 무관 인프라
│   ├── apiClient.ts         # Axios 인스턴스 + 토큰 주입/갱신 인터셉터
│   ├── queryClient.ts       # QueryClient 기본 옵션 (staleTime, retry 등)
│   └── utils.ts             # cn() 등 순수 헬퍼
│
├── components/
│   ├── ui/                  # shadcn/ui 생성 컴포넌트 (Button, Dialog ...) — 전용 영역
│   └── layout/              # AppLayout, Header, Footer 등 공통 레이아웃
│
├── features/                # 도메인별 모듈 (백엔드 도메인 미러링)
│   ├── auth/
│   │   ├── api.ts           # POST /auth/login, /auth/refresh, /users/signup
│   │   ├── hooks.ts         # useLogin, useSignup, useCurrentUser
│   │   ├── schema.ts        # loginSchema, signupSchema (Zod)
│   │   ├── AuthContext.tsx  # 최소 인증 컨텍스트 (토큰·로그인 상태)
│   │   └── components/
│   ├── events/
│   │   ├── api.ts
│   │   ├── hooks.ts         # useEvents, useEvent, useCreateEvent
│   │   ├── schema.ts
│   │   └── components/
│   ├── reservations/        # 비동기 write (202 폴링)
│   │   ├── api.ts
│   │   ├── hooks.ts         # useCreateReservation, useReservation(폴링), useCancelReservation
│   │   ├── schema.ts
│   │   └── components/
│   ├── payments/            # 비동기 write (202 폴링)
│   │   ├── api.ts
│   │   ├── hooks.ts
│   │   ├── schema.ts
│   │   └── components/
│   └── users/
│       ├── api.ts
│       ├── hooks.ts         # useMe, useUpdateMe
│       ├── schema.ts
│       └── components/
│
├── hooks/                   # 도메인 무관 공통 훅 (useDebounce, useInterval 등)
│
├── pages/                   # 라우트 단위 페이지
│   ├── LoginPage.tsx
│   ├── EventListPage.tsx
│   ├── EventDetailPage.tsx
│   ├── ReservationListPage.tsx
│   └── ...
│
├── routes/                  # 라우트 구성·보호 라우트
│   ├── router.tsx           # createBrowserRouter 구성
│   └── ProtectedRoute.tsx
│
└── types/                   # 공통 타입 (ApiError, Paginated<T> 등)
```

### 디렉토리 규칙

- **`features/` 는 백엔드 도메인을 미러링** — `auth/users` · `events` · `reservations` · `payments`. 백엔드에 없는 도메인 디렉토리 추가 금지
- **새 도메인 = `features/<name>/` 디렉토리 하나** — `api.ts` · `hooks.ts` · `schema.ts` + `components/` 가 기본 4 단위
- **`components/ui/` 는 shadcn 전용** — 손으로 일반 컴포넌트를 여기 두지 않는다. shadcn CLI 가 생성한 Radix 기반 프리미티브만
- **공통 UI 는 `components/layout/`, 공통 로직 훅은 `hooks/`** — 도메인 이름이 들어가면 잘못된 위치 (해당 `features/` 로 이동)
- **`lib/` 은 도메인 무관 코드만** — 특정 엔티티(`event`, `reservation`) 이름이 들어가면 위치 오류
- **배럴 파일(`index.ts` re-export) 남용 금지** — 간략화. 경로를 직접 import (백엔드의 "`__init__.py` 비워둔다" 와 동일 정신)

## 라우팅

React Router 로 클라이언트 라우팅을 구성한다. 라우트 정의는 `routes/router.tsx` 한 곳에 모은다.

### 공개 / 보호 라우트

| 경로 | 화면 | 보호 |
|---|---|---|
| `/login` | 로그인 | 공개 |
| `/signup` | 회원가입 | 공개 |
| `/events` | 행사 목록 | 공개 |
| `/events/:eventId` | 행사 상세 | 공개 |
| `/events/new` | 행사 등록 | 🔒 |
| `/reservations` | 내 예매 목록 | 🔒 |
| `/reservations/:reservationId` | 예매 상세 (202 폴링) | 🔒 |
| `/payments` | 결제 내역 | 🔒 |
| `/me` | 내 정보 | 🔒 |

> 🔒 = 인증 필요. 백엔드에 역할 구분이 없으므로 보호 기준은 **로그인 여부 하나뿐**이다.

### 레이아웃 라우트 + 보호 라우트 패턴

공통 레이아웃(`AppLayout`)을 부모 라우트로 두고, 보호가 필요한 구간은 `ProtectedRoute` 로 감싼다.

```tsx
// src/routes/router.tsx
import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

const EventListPage = lazy(() => import("@/pages/EventListPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
const ReservationListPage = lazy(() => import("@/pages/ReservationListPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // 공개
      { path: "/login", element: <LoginPage /> },
      { path: "/events", element: <EventListPage /> },
      { path: "/events/:eventId", element: <EventDetailPage /> },

      // 보호 — 인증 필요 구간을 한 번에 감싼다
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/events/new", element: <EventCreatePage /> },
          { path: "/reservations", element: <ReservationListPage /> },
          { path: "/me", element: <MyPage /> },
        ],
      },
    ],
  },
]);
```

```tsx
// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // 로그인 후 원래 가려던 경로로 복귀시키기 위해 from 보존
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
```

### 규칙

- **라우트 정의는 `routes/` 한 곳** — 페이지 컴포넌트 안에 라우트 분기를 흩지 않는다
- **페이지 컴포넌트는 `lazy()` 로 코드 스플리팅** — 초기 번들 축소. 상세 기준은 [09-performance.md](09-performance.md)
- **보호는 `ProtectedRoute` 단일 패턴** — 페이지마다 `if (!user) redirect` 를 반복하지 않는다
- **경로 변수는 camelCase** — `:eventId`, `:reservationId` (백엔드 `event_id` 와 의미 대응)

## 상태 위치 결정 원칙

상태를 **어디에 둘지**를 세 가지로만 결정한다. 새 전역 상태 라이브러리(Redux·Zustand·Recoil 등)는 도입하지 않는다.

| 상태 종류 | 보관 위치 | 예시 |
|---|---|---|
| **서버 상태** | TanStack Query 캐시 | 행사 목록, 예매 상세, 내 정보 — 서버가 소유하는 모든 데이터 |
| **클라이언트 전역 상태** | 최소한의 인증 컨텍스트 (`AuthContext`) | 로그인 여부, access token, 현재 사용자 식별 |
| **로컬 UI 상태** | `useState` / `useReducer` | 모달 열림, 폼 입력 중간값, 탭 선택, 토글 |

### 규칙

- **서버에서 온 데이터는 절대 전역 store 에 복제하지 않는다** — TanStack Query 가 단일 출처. 상세는 [03-state-and-data.md](03-state-and-data.md)
- **전역 클라이언트 상태는 인증으로 한정** — 그 외 "전역"이 필요해 보이면 대개 서버 상태(Query)이거나 라우트 상태(URL params)다
- **URL 도 상태다** — 페이지·필터·정렬은 query string 으로. 컴포넌트 state 에 가두지 않는다 (새로고침·공유 가능)
- **Redux 등 전역 상태 라이브러리 도입 금지** — 본 앱 규모에서 불필요. 도입하려면 룰셋을 먼저 갱신

## 데이터 흐름 (예매 시나리오)

비동기 write(202) 의 대표 흐름. `page → 훅 → api → 202 → 폴링` 단방향.

```
EventDetailPage
  │
  │ "예매" 클릭 → mutate({ eventId, seatNo })
  ▼
features/reservations/hooks.ts  ─ useCreateReservation()
  │  useMutation → reservationApi.create(...)
  ▼
features/reservations/api.ts  ─ reservationApi.create()
  │  POST /reservations (Authorization: Bearer 인터셉터 자동 주입)
  │  ← 202 Accepted { id, status: "accepted" }
  ▼
hooks.ts  ─ onSuccess
  │  반환된 id 를 가지고 단건 조회 폴링 시작
  ▼
useReservation(id)  ─ useQuery({ refetchInterval })
  │  GET /reservations/{id} 반복 폴링
  │  status: "accepted" → "confirmed" | "failed" 로 전이될 때까지
  ▼
UI 상태 가시화
  └─ "처리 중…" → "예매 완료" 또는 "예매 실패(좌석 선점)"
```

```tsx
// features/reservations/hooks.ts (개념 예시 — 상세는 02·03 참조)
export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reservationApi.create,            // POST → 202 { id }
    onSuccess: ({ id }) => {
      // 반환 id 로 단건 폴링 쿼리를 활성화/무효화
      queryClient.invalidateQueries({ queryKey: ["reservation", id] });
    },
  });
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["reservation", id],
    queryFn: () => reservationApi.getById(id),    // GET /reservations/{id}
    // 처리 중(accepted)이면 계속 폴링, 종결되면 멈춘다
    refetchInterval: (q) =>
      q.state.data?.status === "accepted" ? 1500 : false,
  });
}
```

### 흐름 규칙

- **write 는 `useMutation`, read·폴링은 `useQuery`** — 역할 분리
- **202 의 `id` 는 즉시 폴링 키** — POST 응답을 "완료"로 취급하지 않는다. 단건 조회로 실제 상태(`confirmed`/`failed`) 를 확인
- **폴링 종료 조건 명시** — 종결 상태에 도달하면 `refetchInterval` 을 멈춘다 (무한 폴링 금지)
- **취소(DELETE)도 동일** — `reservations`·`payments` 의 DELETE 역시 202 → 폴링으로 반영 확인

## 환경 설정

### Vite 환경 변수

```ts
// 사용 — import.meta.env, VITE_ 접두사만 클라이언트에 노출됨
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8020";
```

```ini
# .env.example  (커밋함 — 키 목록 공유용)
VITE_API_BASE_URL=http://localhost:8020
```

### 규칙

- **클라이언트 노출 변수는 `VITE_` 접두사 필수** — 접두사 없는 변수는 번들에 포함되지 않는다 (Vite 사양)
- **`import.meta.env` 로만 접근** — `process.env` 사용 금지
- **`.env` 는 커밋하지 않는다** — `.gitignore` 에 명시. `.env.example` 로 키 목록만 공유
- **환경별 분기 최소화** — `if (env === "production")` 코드 분기 대신 환경 변수 값 차이로 처리 (백엔드 12-factor 원칙과 동일)
- **비밀값을 프론트에 두지 않는다** — `VITE_` 변수는 모두 번들에 노출된다. JWT secret·API key 등 비밀은 프론트엔드에 존재할 수 없다

## 확장 시점 가이드

본 아키텍처가 **이미 전제하는** 것 — 처음부터 함께 코딩한다.

| 항목 | 상태 | 적용 위치 |
|---|---|---|
| TanStack Query | **도입됨** | 모든 서버 상태 (목록·단건·폴링) |
| React Router (lazy) | **도입됨** | 라우팅 + 페이지 코드 스플리팅 |
| Axios 인터셉터 | **도입됨** | 토큰 주입 + 401 자동 갱신 ([02-api-integration.md](02-api-integration.md)) |
| 인증 Context | **도입됨** | 클라이언트 전역 상태 (로그인 여부) — 이 한 가지 용도만 |
| Zod | **도입됨** | 폼 검증 + API 응답 형태 검증 |
| shadcn/ui + Tailwind | **도입됨** | 디자인 시스템 ([08-design-system.md](08-design-system.md)) |

다음은 **현재 단계에서 도입하지 않는다.** 본 앱은 API 범위 내 화면·디자인에 집중하므로 기능 확장 자체가 목표가 아니다.

| 항목 | 비도입 이유 |
|---|---|
| Redux / Zustand / Recoil | 서버 상태는 Query, 클라 전역은 인증 Context 로 충분 |
| SSR / Next.js | 정적 SPA 로 충분. SEO·초기 렌더 요구 없음 |
| i18n (다국어) | 한국어 단일 정책. 다국어 요구 없음 |
| 상태 머신(XState) | 202 폴링은 Query `refetchInterval` 로 충분. 복잡한 상태 전이 없음 |
| GraphQL / 코드젠 | 백엔드는 REST. Swagger 기반 수기 타입으로 충분 |
| 마이크로 프론트엔드 | 단일 앱. 분할 필요 없음 |
| 권한(RBAC) 분기 | 백엔드에 역할 구분 없음 → 로그인 여부만 |
| 결제 PG 위젯 | `payment_method` 는 문자열 기록만 (백엔드 Mock) |

> **현재 단계는 단일 Vite SPA + TanStack Query + Axios** 이다. 위 미도입 항목들을 미리 추상화해두지 않는다.

## 안티 패턴

### 금지

- **컴포넌트 안에서 `apiClient` 직접 호출** — 데이터는 feature 훅(`useEvents` 등)을 통해서만. `useEffect` + `axios.get` 패턴 금지
- **서버 데이터를 전역 store 에 복제** — TanStack Query 캐시가 단일 출처. `setState` 로 옮겨 들고 다니지 않는다
- **page 가 다른 feature 의 `api.ts` 를 직접 import** — 도메인 협력은 각 feature 훅을 page 가 조합
- **`features/` 외부에 도메인 로직 산재** — 도메인 hook·api·schema 는 해당 `features/<name>/` 안에만
- **`components/ui/` 에 손으로 일반 컴포넌트 작성** — shadcn 생성물 전용. 일반 도메인 UI 는 `features/*/components`
- **페이지마다 `if (!user) redirect` 반복** — `ProtectedRoute` 단일 패턴 사용
- **전역 상태 라이브러리(Redux 등) 도입** — 본 룰셋 범위 밖. 인증 Context + Query 로 해결
- **`process.env` / 비밀값 프론트 노출** — `import.meta.env` + `VITE_` 만. 비밀은 프론트에 두지 않는다
- **202 POST 응답을 "완료"로 처리** — 반드시 반환 `id` 로 단건 조회 폴링하여 실제 종결 상태 확인
- **무한 폴링** — `refetchInterval` 에 종료 조건(종결 상태 도달 시 중단) 필수
