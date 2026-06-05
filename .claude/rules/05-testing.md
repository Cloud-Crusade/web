# 테스트 전략 및 품질 게이트

## 핵심 원칙

> **간략화 우선** — 모든 컴포넌트에 강제로 테스트를 붙이지 않는다. **핵심 사용자 흐름 + 회귀 위험 지점**을 우선 커버한다. 그리고 **구현 디테일(내부 state, 클래스명) 이 아니라 사용자 관점**(화면에 보이는 것, 사용자가 하는 행동)으로 테스트한다. 과한 mock·과한 스냅샷·과한 setup 은 유지보수성을 떨어뜨린다.

## 테스트 철학

### 무엇을 테스트하는가

- **사용자가 보는 것 · 하는 것** — "버튼을 누르면 에러 메시지가 보인다", "예매가 처리 중으로 표시된다"
- **회귀하면 아픈 곳** — 로그인, 예매/결제 제출, 폼 검증, 비동기 202 반영, 401/503 처리
- **로직 단위** — 커스텀 훅, 유틸 함수, Zod 스키마

### 무엇을 테스트하지 않는가

- **구현 디테일** — `useState` 의 내부 값, 컴포넌트가 어떤 훅을 호출했는지, props 가 그대로 꽂혔는지
- **단순 표현 컴포넌트** — Tailwind 클래스만 붙은 presentational 컴포넌트는 강제 X
- **라이브러리 자체** — TanStack Query·Axios·React Router 가 동작하는지는 그쪽 책임

> RTL 의 모토를 따른다: **"The more your tests resemble the way your software is used, the more confidence they give you."** `getByRole`/`getByText` 같이 사용자가 인지하는 방식으로 요소를 찾고, `data-testid` 는 최후의 수단으로만 쓴다.

### 테스트 피라미드

```
   E2E (선택, 범위 밖)    ← Playwright. 핵심 happy path 만, 본 룰셋에선 강제 X
  ┌──────────────────┐
  │   Integration    │ (30%)  ← 페이지/feature + MSW. 실제 라우팅·Query·폼 조합
  ├──────────────────┤
  │   Component      │ (40%)  ← RTL + user-event. 단일 컴포넌트 인터랙션
  ├──────────────────┤
  │      Unit        │ (30%)  ← 훅(renderHook) · 유틸 · Zod 스키마
  └──────────────────┘
```

- **Unit** — 순수 로직. 훅은 `renderHook`, 유틸/스키마는 직접 호출
- **Component** — 컴포넌트 1개를 렌더하고 user-event 로 상호작용
- **Integration** — 페이지 단위 + MSW 로 네트워크를 가짜 서버로 대체. **mock 을 최소화하고 실제 코드 경로(api 모듈 → Query 훅 → 렌더)를 통과**시키는 게 핵심
- **E2E (Playwright)** — 실제 브라우저 + 실제 백엔드. **본 룰셋 범위 밖** — 도입 시 별도 `e2e/` 디렉토리 + CI job 분리. Vitest 통합 테스트와 책임이 겹치지 않게 happy path 만

## 커버리지 목표

c8/v8 커버리지 (`vitest --coverage`, provider `v8`).

| 영역 | 목표 | 비고 |
|---|---|---|
| 전체 | 70%+ | line / statement 기준 |
| `features/<domain>/hooks` (Query/Mutation 훅) | 85%+ | 데이터·로직 핵심 |
| `features/<domain>/schema` (Zod 스키마) | 90%+ | 검증 분기 |
| `lib/api/` (Axios 모듈, 202 폴링) | 80%+ | 회귀 위험 큼 |
| 컴포넌트 (폼·인터랙션) | 핵심 인터랙션 커버 | 제출·검증·상태 전환 |
| 단순 표현 컴포넌트 (UI only) | 강제 X | shadcn 래퍼·레이아웃 |

> 커버리지 숫자 자체가 목표가 아니다. **핵심 흐름이 깨지면 빨개지는** 테스트가 목표다. 표현 컴포넌트를 억지로 커버하려고 스냅샷을 남발하지 않는다.

## 도구 구성

### 의존성

```jsonc
// package.json (devDependencies)
{
  "vitest": "...",
  "@vitest/coverage-v8": "...",
  "jsdom": "...",
  "@testing-library/react": "...",
  "@testing-library/user-event": "...",
  "@testing-library/jest-dom": "...",
  "msw": "..."
}
```

### vitest.config.ts

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true, // describe/it/expect 전역 사용 (import 생략)
    setupFiles: ["./src/test/setup.ts"],
    css: false, // Tailwind 클래스는 테스트에서 무의미 → 파싱 생략
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
      exclude: [
        "**/*.config.ts",
        "src/main.tsx", // 부트스트랩
        "src/**/*.d.ts",
        "src/test/**", // 테스트 유틸 자체
        "src/**/index.ts", // 배럴 re-export
      ],
    },
  },
});
```

### setup.ts (전역 setupFiles)

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest"; // toBeInTheDocument 등 matcher
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// MSW node 서버 — 모든 테스트가 공유하는 단일 mock 서버
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup(); // 렌더된 DOM 정리
  server.resetHandlers(); // 테스트별 override 한 핸들러 초기화
});
afterAll(() => server.close());
```

- **`onUnhandledRequest: "error"`** — mock 하지 않은 실제 네트워크 호출을 즉시 실패시킨다. 실수로 외부로 나가는 요청 차단
- **`cleanup()`** — RTL 의 unmount. 테스트 간 DOM 누수 방지 (globals 환경에선 자동이지만 명시)

## 디렉토리 구조 (소스 미러링)

테스트는 **소스 옆 `*.test.ts(x)`** 또는 `__tests__/` 디렉토리에 둔다. 한 프로젝트 안에서 한 가지 방식으로 통일한다(소스 옆 co-locate 권장).

```
src/
├── test/
│   ├── setup.ts                       # 전역 setupFiles
│   ├── utils.tsx                      # renderWithProviders, createTestQueryClient
│   └── msw/
│       ├── server.ts                  # setupServer
│       └── handlers/
│           ├── index.ts               # 전역 기본 핸들러 합성
│           ├── auth.ts                # /auth/login, /users
│           ├── events.ts              # /events
│           └── reservations.ts        # /reservations (202 + 폴링)
│
├── features/
│   ├── auth/
│   │   ├── hooks/
│   │   │   ├── useLogin.ts
│   │   │   └── useLogin.test.tsx      # 훅 단위 테스트
│   │   ├── schema.ts
│   │   ├── schema.test.ts             # Zod 스키마 단위 테스트
│   │   └── components/
│   │       ├── LoginForm.tsx
│   │       └── LoginForm.test.tsx     # 컴포넌트 테스트
│   └── reservations/
│       ├── hooks/
│       │   ├── useCreateReservation.ts
│       │   └── useCreateReservation.test.tsx
│       └── components/
│           ├── ReservationButton.tsx
│           └── ReservationButton.test.tsx
│
└── pages/
    ├── LoginPage.tsx
    └── LoginPage.test.tsx             # 페이지 통합 테스트 (라우팅 + MSW)
```

### 규칙
- **소스 구조 미러링** — `features/auth/components/LoginForm.tsx` → 같은 폴더 `LoginForm.test.tsx`
- **파일명은 `*.test.tsx`** (JSX 있으면 `.tsx`, 순수 로직이면 `.test.ts`)
- **테스트 유틸·MSW 는 `src/test/`** 한곳에 — 여기저기 흩지 않음

## 테스트 네이밍

### 패턴

```
describe("<컴포넌트/훅/스키마 이름>")
  it("<조건>하면 <기대 결과>한다")
```

- **한국어 또는 영문 일관** — 한 프로젝트에서 섞지 않는다. 본 프로젝트는 **한국어** 권장(주석 한국어 단일 정책과 일관, [06-code-style.md](06-code-style.md))
- **조건 + 기대결과 모두 명시** — `it("로그인된다")` 같은 모호한 이름 금지

### 예시

```tsx
describe("LoginForm", () => {
  it("이메일이 비어 있으면 검증 에러를 보여준다", () => { ... });
  it("올바른 정보로 제출하면 onSuccess 가 호출된다", () => { ... });
  it("서버가 401 을 반환하면 인증 실패 메시지를 보여준다", () => { ... });
});

describe("useCreateReservation", () => {
  it("202 응답 후 폴링하여 예매가 confirmed 로 반영된다", () => { ... });
  it("좌석이 선점되어 있으면 409 에러를 노출한다", () => { ... });
});

describe("loginSchema", () => {
  it("비밀번호가 8자 미만이면 검증에 실패한다", () => { ... });
});
```

## 테스트 헬퍼

### renderWithProviders + QueryClient 격리

TanStack Query 를 쓰는 컴포넌트/훅은 `QueryClientProvider` 가 필요하다. **테스트마다 새 QueryClient** 를 만들어 캐시가 새지 않게 격리하고, `retry: false` 로 에러 테스트가 재시도로 느려지지 않게 한다.

```tsx
// src/test/utils.tsx
import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// 테스트마다 호출 — 캐시 격리
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface Options extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  client?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", client = createTestQueryClient(), ...options }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
}
```

### renderHook 용 wrapper

```tsx
// src/test/utils.tsx (이어서)
export function createQueryWrapper(client = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
```

### 규칙
- **QueryClient 는 테스트마다 new** — `beforeEach` 또는 헬퍼 기본값으로. 전역 1개 공유 금지(캐시 누수)
- **`retry: false`** — 에러 테스트가 기본 3회 재시도로 타임아웃되는 것 방지
- **user-event 는 `userEvent.setup()`** 으로 인스턴스 생성 후 사용 (v14 권장)

## MSW 핸들러

네트워크는 **MSW 로 가로채 가짜 응답**을 준다. Axios 를 직접 mock 하지 않는다 — api 모듈·인터셉터·Query 훅이 실제로 실행되어야 회귀를 잡는다.

### 도메인별 핸들러

```ts
// src/test/msw/handlers/auth.ts
import { http, HttpResponse } from "msw";

const BASE = "http://localhost:8020";

export const authHandlers = [
  // 성공
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === "wrong") {
      return HttpResponse.json(
        { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다", details: {} },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      access_token: "access.mock.token",
      refresh_token: "refresh.mock.token",
    });
  }),

  http.get(`${BASE}/users/me`, () =>
    HttpResponse.json({ id: 1, email: "tester@example.com", created_at: "2026-01-01" }),
  ),
];
```

```ts
// src/test/msw/handlers/events.ts
import { http, HttpResponse } from "msw";

const BASE = "http://localhost:8020";

export const eventHandlers = [
  http.get(`${BASE}/events`, () =>
    HttpResponse.json({
      items: [{ id: 1, title: "테스트 콘서트", venue: "잠실", available_seats: 100 }],
      total: 1,
      page: 1,
      size: 20,
    }),
  ),

  http.get(`${BASE}/events/:eventId`, ({ params }) =>
    HttpResponse.json({ id: Number(params.eventId), title: "테스트 콘서트", available_seats: 100 }),
  ),
];
```

### 에러 응답 핸들러 (409 / 422 / 503)

표준 에러 형식 `{ code, message, details }` ([04-error-handling.md](04-error-handling.md)) 를 그대로 mock 한다.

```ts
// src/test/msw/handlers/reservations.ts (에러 예시)
import { http, HttpResponse } from "msw";

const BASE = "http://localhost:8020";

// 409 — 좌석 선점
export const seatTakenHandler = http.post(`${BASE}/reservations`, () =>
  HttpResponse.json(
    { code: "SEAT_ALREADY_TAKEN", message: "이미 선점된 좌석입니다", details: { event_id: 1, seat_no: "A-1" } },
    { status: 409 },
  ),
);

// 422 — 검증 실패
export const validationErrorHandler = http.post(`${BASE}/reservations`, () =>
  HttpResponse.json(
    { code: "VALIDATION_ERROR", message: "요청 검증 실패", details: [] },
    { status: 422 },
  ),
);

// 503 — 백프레셔
export const backpressureHandler = http.post(`${BASE}/reservations`, () =>
  HttpResponse.json(
    { code: "DB_UNAVAILABLE", message: "일시적인 데이터베이스 오류", details: {} },
    { status: 503, headers: { "Retry-After": "2" } },
  ),
);
```

### 202 + 폴링 시나리오

예매·결제 write 는 `202 Accepted` + 식별자 즉시 반환 후, 단건 조회를 폴링해 상태가 `confirmed` 로 바뀌는 걸 확인한다([02-api-integration.md](02-api-integration.md)). MSW 로 **첫 조회는 `pending`, 이후 `confirmed`** 를 흉내 낸다.

```ts
// src/test/msw/handlers/reservations.ts (202 + 폴링)
import { http, HttpResponse } from "msw";

const BASE = "http://localhost:8020";

export function reservationPollingHandlers() {
  let polls = 0;
  return [
    // write → 202 + 식별자 즉시 반환
    http.post(`${BASE}/reservations`, () =>
      HttpResponse.json({ reservation_id: 99, status: "pending" }, { status: 202 }),
    ),
    // 폴링 — 첫 N회는 pending, 이후 confirmed
    http.get(`${BASE}/reservations/:id`, ({ params }) => {
      polls += 1;
      const status = polls >= 2 ? "confirmed" : "pending";
      return HttpResponse.json({ id: Number(params.id), status, seat_no: "A-1" });
    }),
  ];
}
```

### 핸들러 합성 + 테스트별 override

```ts
// src/test/msw/handlers/index.ts
import { authHandlers } from "./auth";
import { eventHandlers } from "./events";

export const handlers = [...authHandlers, ...eventHandlers]; // 전역 기본
```

```ts
// src/test/msw/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```tsx
// 테스트 안에서 특정 케이스만 override
import { server } from "@/test/msw/server";
import { seatTakenHandler } from "@/test/msw/handlers/reservations";

it("좌석 선점 시 에러를 보여준다", async () => {
  server.use(seatTakenHandler); // afterEach 의 resetHandlers 가 자동 원복
  // ...
});
```

### 규칙
- **전역 기본 핸들러는 happy path** — 에러·특수 케이스는 테스트 안에서 `server.use(...)` override
- **base URL 은 `http://localhost:8020`** — 실제 `VITE_API_BASE_URL` 과 일치시키거나 상대경로 매칭
- **응답은 실제 백엔드 스키마 그대로** — 필드 누락하면 통합 테스트가 거짓 통과

## 컴포넌트 테스트

### 폼 제출 (로그인)

```tsx
// src/features/auth/components/LoginForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("올바른 정보로 제출하면 onSuccess 가 호출된다", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("이메일"), "tester@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password1234");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    // 비동기 mutation 완료 대기 — findBy/waitFor
    await screen.findByText(/환영합니다/);
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
```

### 검증 에러 표시

```tsx
it("이메일 형식이 잘못되면 검증 에러를 보여준다", async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText("이메일"), "not-an-email");
  await user.click(screen.getByRole("button", { name: "로그인" }));

  // Zod resolver 가 막아 네트워크 호출 없이 에러 노출
  expect(await screen.findByText("올바른 이메일을 입력하세요")).toBeInTheDocument();
});
```

### 서버 에러 (401) 표시

```tsx
it("서버가 401 을 반환하면 인증 실패 메시지를 보여준다", async () => {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText("이메일"), "tester@example.com");
  await user.type(screen.getByLabelText("비밀번호"), "wrong"); // MSW 가 401 반환
  await user.click(screen.getByRole("button", { name: "로그인" }));

  expect(
    await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다"),
  ).toBeInTheDocument();
});
```

### 로딩 / 빈 / 에러 상태

목록 컴포넌트의 3가지 상태([04-error-handling.md](04-error-handling.md))를 각각 확인한다.

```tsx
// 로딩
it("데이터를 불러오는 동안 로딩 표시를 보여준다", () => {
  renderWithProviders(<EventList />);
  expect(screen.getByRole("status", { name: /불러오는 중/ })).toBeInTheDocument();
});

// 빈 상태
it("행사가 없으면 빈 상태 메시지를 보여준다", async () => {
  server.use(http.get(`${BASE}/events`, () =>
    HttpResponse.json({ items: [], total: 0, page: 1, size: 20 }),
  ));
  renderWithProviders(<EventList />);
  expect(await screen.findByText("등록된 행사가 없습니다")).toBeInTheDocument();
});

// 에러 상태
it("조회 실패 시 에러 + 재시도 버튼을 보여준다", async () => {
  server.use(http.get(`${BASE}/events`, () =>
    HttpResponse.json({ code: "DB_UNAVAILABLE", message: "...", details: {} }, { status: 503 }),
  ));
  renderWithProviders(<EventList />);
  expect(await screen.findByRole("button", { name: "다시 시도" })).toBeInTheDocument();
});
```

### 비동기 202 → confirmed 반영

```tsx
it("예매 제출 후 폴링하여 처리 완료로 바뀐다", async () => {
  server.use(...reservationPollingHandlers());
  const user = userEvent.setup();
  renderWithProviders(<ReservationButton eventId={1} seatNo="A-1" />);

  await user.click(screen.getByRole("button", { name: "예매하기" }));

  // 즉시 "처리 중" 노출
  expect(await screen.findByText("처리 중")).toBeInTheDocument();
  // 폴링 후 "예매 완료" — findBy 가 자동 재시도하며 대기
  expect(await screen.findByText("예매 완료")).toBeInTheDocument();
});
```

## 훅 테스트 (renderHook)

### useMutation 훅

```tsx
// src/features/reservations/hooks/useCreateReservation.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "@/test/utils";
import { server } from "@/test/msw/server";
import { seatTakenHandler } from "@/test/msw/handlers/reservations";
import { useCreateReservation } from "./useCreateReservation";

describe("useCreateReservation", () => {
  it("좌석이 선점되어 있으면 409 에러를 노출한다", async () => {
    server.use(seatTakenHandler);
    const { result } = renderHook(() => useCreateReservation(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate({ eventId: 1, seatNo: "A-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: "SEAT_ALREADY_TAKEN" });
  });
});
```

### useQuery 훅

```tsx
it("행사 목록을 불러온다", async () => {
  const { result } = renderHook(() => useEvents(), { wrapper: createQueryWrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.items).toHaveLength(1);
});
```

### 규칙
- **`waitFor(() => expect(result.current.isSuccess).toBe(true))`** — 비동기 상태 안정화 대기. `result.current` 를 await 없이 바로 단정하면 초기 `isLoading` 상태를 보게 됨
- **wrapper 는 매 테스트 새 QueryClient** — `createQueryWrapper()` 기본값이 이를 보장

## 폼 검증 테스트 (Zod)

스키마는 **단위 테스트로 분기를 직접 검증**하고, 폼 통합은 컴포넌트 테스트가 맡는다(이중으로 모든 경우를 RTL 로 돌리지 않는다).

```ts
// src/features/auth/schema.test.ts
import { describe, it, expect } from "vitest";
import { loginSchema } from "./schema";

describe("loginSchema", () => {
  it("올바른 입력을 통과시킨다", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "password1234" });
    expect(r.success).toBe(true);
  });

  it.each([
    ["", "password1234", "email"],
    ["not-email", "password1234", "email"],
    ["a@b.com", "short", "password"],
  ])("잘못된 입력(%s/%s)은 %s 필드에서 실패한다", (email, password, field) => {
    const r = loginSchema.safeParse({ email, password });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path[0]).toBe(field);
  });
});
```

- **`it.each` 로 분기 테이블화** — 백엔드의 `parametrize` 와 동일 정신. if/else 분기 없이 케이스 나열

## 비동기 테스트

### findBy / waitFor — getBy 로 대기 금지

```tsx
// 나쁨 — getBy 는 즉시 평가, 아직 없으면 throw
expect(screen.getByText("예매 완료")).toBeInTheDocument();

// 좋음 — findBy 는 나타날 때까지 재시도(기본 1초)
expect(await screen.findByText("예매 완료")).toBeInTheDocument();

// 좋음 — 부수효과/상태를 기다릴 땐 waitFor
await waitFor(() => expect(onSuccess).toHaveBeenCalled());
```

### act 경고

- **`userEvent` / `findBy` / `waitFor` 를 쓰면 act 는 자동 처리**된다. `act(...)` 를 수동으로 감쌀 필요 없음
- act 경고가 뜨면 보통 **await 누락** 신호 — `user.click` / `findBy` 앞 `await` 를 확인한다

### fake timers 로 폴링 테스트

폴링 간격(예: 1초)을 실제로 기다리지 않고 타이머를 진행시킨다.

```tsx
import { vi } from "vitest";

it("폴링 간격마다 재조회한다", async () => {
  vi.useFakeTimers();
  // ...렌더 + 제출...

  await vi.advanceTimersByTimeAsync(1000); // 1초 경과 시뮬레이션 → 다음 폴링 트리거
  expect(await screen.findByText("예매 완료")).toBeInTheDocument();

  vi.useRealTimers();
});
```

- **`advanceTimersByTimeAsync`** — 타이머 + 그 사이 resolve 되는 promise(MSW 응답)를 함께 처리
- **`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`** — fake timer 와 user-event 병행 시 지정
- fake timer 는 **필요한 테스트에서만** 켜고 `useRealTimers()` 로 반드시 복원

## 품질 게이트

### 로컬 명령

```bash
pnpm test            # vitest run (watch 아님)
pnpm test:cov        # vitest run --coverage
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
```

```jsonc
// package.json (scripts)
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:cov": "vitest run --coverage",
  "lint": "eslint . --max-warnings=0",
  "typecheck": "tsc --noEmit"
}
```

### CI 워크플로

```yaml
# .github/workflows/test.yml
name: ci

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: 의존성 설치
        run: pnpm install --frozen-lockfile

      - name: 린트
        run: pnpm lint

      - name: 타입 검사
        run: pnpm typecheck

      - name: 테스트 + 커버리지
        run: pnpm test:cov

      - name: 커버리지 업로드
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### 규칙
- **PR 은 lint + typecheck + test 모두 green** 이어야 머지 ([07-workflow.md](07-workflow.md))
- **`--frozen-lockfile`** — lockfile 과 불일치 시 CI 실패 (재현성)
- **신규 기능은 테스트 동반** — [README.md](README.md) 의 "테스트와 함께" 원칙

## 안티 패턴

### 금지
- **구현 디테일 테스트** — 내부 `useState` 값, 호출된 훅, props 전달 여부 단정. **화면에 보이는 결과**로 검증
- **실제 네트워크 호출** — `setup.ts` 의 `onUnhandledRequest: "error"` 로 차단. 외부로 나가면 테스트 실패가 정상
- **Axios 를 통째로 mock** — api 모듈·인터셉터(토큰 주입·401 갱신)가 안 돌아가 회귀를 못 잡는다. MSW 로 네트워크 경계만 가짜
- **`getBy*` 로 비동기 대기** — 아직 없는 요소에 throw. 비동기는 `findBy*`/`waitFor`
- **스냅샷 남발** — 의미 없는 대형 스냅샷은 변경마다 무지성 갱신 유발. 작은 직렬화 결과에만 제한적으로
- **모든 것을 mock 해 통합이 안 되는 테스트** — mock 천국은 "코드가 실제로 연결되는지" 를 검증하지 못함
- **`act(...)` 수동 남용** — `userEvent`/`findBy`/`waitFor` 로 충분. act 경고는 보통 `await` 누락 신호
- **전역 QueryClient 공유** — 테스트 간 캐시 누수로 순서 의존 발생. 테스트마다 new + `retry: false`
- **fake timer 켜고 안 끄기** — 다른 테스트에 전염. 반드시 `useRealTimers()` 복원
- **표현 컴포넌트 억지 커버** — 커버리지 숫자 맞추려 의미 없는 렌더 단정 추가 금지
