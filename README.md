# C.C Ticketing Web

팀 **C.C (Cloud Crusade)** 티켓팅 서비스의 웹 프론트엔드입니다. 백엔드 API([`cc/app`](../app))가 제공하는 **인증 · 행사 관리 · 티켓팅(예매/결제)** 기능을 사용자에게 노출하는 단일 페이지 애플리케이션(SPA)입니다.

> **프로젝트 성격** — 본 웹앱은 백엔드와 동일하게 *AWS 인프라 스파이크 흡수 검증 시스템*의 클라이언트입니다. 따라서 **API 가 제공하지 않는 기능은 추가하지 않으며**, 화면은 **깔끔한 디자인과 효율적인 기능 배치**, 그리고 **티켓 오픈 스파이크 순간의 UX**(202 비동기 정착·503 백프레셔·409 좌석 충돌·대기열)에 집중합니다. (관리자 대시보드·통계·추천·검색 고도화·알림·결제 PG 위젯 등은 범위 밖)

<br>

## 1. 프로젝트 소개

`cc-ticketing-web` 은 백엔드 [`cc/app`](../app) (FastAPI, `http://localhost:8020`, Swagger [`/docs`](http://localhost:8020/docs)) 의 **인증 · 행사 관리 · 티켓팅(예매/결제)** 만 소비하는 SPA 입니다. 자체 서버·DB 가 없는 정적 자산 빌드이며, 백엔드와 같은 *AWS 인프라 스파이크 흡수 검증* 베드의 클라이언트로서 **티켓 오픈 순간의 폭증 트래픽 UX** 가 가장 중요한 책임입니다.

### 기술 스택

| 영역            | 기술                                                                |
| --------------- | ------------------------------------------------------------------- |
| 빌드·번들러     | Vite 6                                                              |
| UI · 언어       | React 18.3 + TypeScript ~5.6 (`strict`) — SPA                       |
| 라우팅          | React Router 6.28 (`createBrowserRouter`, `lazy`)                  |
| 서버 상태·캐시  | TanStack Query 5.62                                                 |
| HTTP 클라이언트 | Axios 1.7 (단일 인스턴스 + 인터셉터로 토큰 주입·갱신)               |
| 폼·검증         | React Hook Form 7.54 + Zod 3.24 (`@hookform/resolvers`)            |
| 스타일링        | Tailwind CSS 3.4 (+animate), `cn`(clsx + tailwind-merge), `cva`     |
| 컴포넌트        | shadcn/ui (Radix 기반, new-york / zinc), lucide-react, sonner       |
| 테스트          | Vitest 3.2 + Testing Library + MSW 2.7 + jsdom                      |
| 린트·포맷       | ESLint 9 (flat, simple-import-sort) + Prettier 3 (+tailwindcss)    |
| 런타임·패키지   | Node ≥ 20, pnpm 9.15.9                                              |

> 상태 관리는 **서버 상태(TanStack Query) 우선**. 전역 클라이언트 상태는 인증(`AuthContext`) 하나로 최소화하며, Redux/Zustand 는 도입하지 않습니다.

<br>

## 2. 설계 방향 & 고려 사항

본 README 는 **전체 그림**만 다루고, 레이어별 상세는 모듈 README([4. 모듈 구성](#4-모듈-구성))로 위임합니다.

- **API 범위 내 집중** — 백엔드가 노출하지 않는 기능(관리자·통계·권한 분리·PG 위젯)은 어떤 형태로도 화면을 만들지 않습니다. 백엔드 도메인(`auth/users · events · reservations · payments`)을 `features/` 로 그대로 미러링해 탐색 비용을 낮춥니다.
- **서버 상태 = React Query 우선** — fetch 로 가져오는 모든 데이터는 Query 캐시가 단일 출처입니다. `useState` 로 서버 데이터를 복제하지 않고, 페이지·필터는 URL(`usePageParam`)에 둡니다.
- **비동기 202 정착 가시화** — 예매·결제 생성/취소는 즉시 처리되지 않고 `202 Accepted` + 식별자만 반환합니다(SQS→Lambda). 단건 GET 폴링으로 반영을 확인하며, 그 공통 메커니즘을 [`useSettlementQuery`](src/features/README.md#공통-훅) 한 곳에 통합했습니다. "처리 중 → 완료 / 실패 / 지연" 을 항상 시각화합니다.
- **대기열 게이트** — 행사 상세는 대기열(`QueueGate`)을 통과해야 진입합니다. `COMPLETED` 시 발급되는 입장 토큰(`RESERVATION` 헤더)으로 예매 경로를 보호합니다.
- **스파이크 UX** — 503 백프레셔는 `Retry-After` 존중, 409 좌석 충돌은 즉시 피드백 + 갱신, 중복 제출 차단, 폴링 타임아웃은 '실패'가 아닌 '지연' 으로 안내합니다.

<br>

## 3. 주요 기능 · 화면 구성

API 도메인을 그대로 정보 구조(IA)에 매핑합니다. 인증이 필요한 화면은 🔒 로 표시합니다.

### 공개 영역

| 화면      | 경로               | 연동 API                                 |
| --------- | ------------------ | ---------------------------------------- |
| 로그인    | `/login`           | `POST /auth/login`, `POST /auth/refresh` |
| 회원가입  | `/signup`          | `POST /auth/signup`                      |
| 행사 목록 | `/events`          | `GET /events` (페이지네이션)             |
| 행사 상세 | `/events/:eventId` | `GET /events/{event_id}` (대기열 게이트) |

### 인증 영역 🔒

| 화면             | 경로                           | 연동 API                                                           |
| ---------------- | ------------------------------ | ------------------------------------------------------------------ |
| 행사 등록        | `/events/new`                  | `POST /events`                                                     |
| 행사 수정·삭제   | `/events/:eventId` 내 액션     | `PATCH /events/{event_id}`, `DELETE /events/{event_id}`            |
| 대기열           | `/queue/:eventId`              | `GET /queue/{event_id}` (2초 폴링 → 입장 토큰)                     |
| 예매하기         | `/events/:eventId` 내 액션     | `POST /reservations` (202 비동기)                                  |
| 내 예매 목록     | `/reservations`                | `GET /reservations`                                                |
| 예매 상세 · 취소 | `/reservations/:reservationId` | `GET /reservations/{id}`, `DELETE /reservations/{id}` (202 비동기) |
| 결제하기         | 예매 상세 내 액션              | `POST /payments` (202 비동기)                                      |
| 내 결제 내역     | `/payments`                    | `GET /payments`, `GET /payments/{id}`                              |
| 내 정보          | `/me`                          | `GET /users/me`                                                    |

> 행사 등록·수정·삭제는 로그인 사용자라면 누구나 가능합니다(백엔드에 관리자 역할 구분이 없음). 권한 분리는 API 범위 밖이므로 화면에서도 도입하지 않습니다.

### 백엔드 API 연동

- **기본 URL**: `http://localhost:8020` (env `VITE_API_BASE_URL`) · **Swagger**: <http://localhost:8020/docs>
- 백엔드 실행은 [`cc/app`](../app) 참조 (docker-compose 로 PostgreSQL × 2 · Redis 기동).

#### 인증 흐름 (JWT)

- 로그인 시 `access_token`(30분) + `refresh_token`(14일)을 발급받습니다.
- 모든 보호 요청은 `Authorization: Bearer <access_token>` 헤더로 전송합니다(요청 인터셉터 자동 주입).
- access 토큰 만료(401) 시 Axios 인터셉터가 `POST /auth/refresh` 로 **단일 refresh 를 공유**해 자동 갱신 후 원요청을 재시도하고, 갱신도 실패하면 토큰을 정리하고 **새로고침**해 가드가 로그인으로 보냅니다. (인터셉터 상세 → [`lib` README](src/lib/README.md))

#### 비동기 write 패턴 (예매·결제) — UX 핵심

예매·결제 생성/취소는 **즉시 처리되지 않습니다.** 백엔드가 SQS 로 발행하고 Lambda 가 처리하는 구조라, 요청은 `202 Accepted` 와 함께 식별자만 즉시 반환합니다.

```jsonc
// POST /reservations 응답 (202)
{ "reservation_id": "…", "status": "accepted" }
```

따라서 화면은 다음 패턴으로 처리합니다.

1. 요청 → `202` 수신 → **"처리 중"** 상태로 표시 (단정 금지)
2. 반환된 식별자로 단건 조회를 **폴링**하여 반영 확인 ([`useSettlementQuery`](src/features/README.md#공통-훅))
3. 좌석 선점 실패 등은 `409`(이미 선점된 좌석) / `404`(미정착/없음)로 즉시 피드백
4. 타임아웃은 **실패가 아닌 '지연'** 으로 안내

#### 표준 에러 응답

백엔드는 모든 에러를 `{ code, message, details }` 형식으로 반환합니다. `toApiError` 로 정규화한 뒤 `code`/`status` 기준으로 분기합니다.

| 상태 | 의미                       | 화면 처리                                  |
| ---- | -------------------------- | ------------------------------------------ |
| 401  | 인증 필요·토큰 만료        | 인터셉터 refresh 재시도 → 실패 시 새로고침 |
| 404  | 리소스 없음 / 미정착       | 빈 상태(EmptyState) 또는 폴링 지속         |
| 409  | 좌석 선점 충돌             | 인라인 경고 + 목록·잔여 갱신               |
| 422  | 요청 검증 실패             | 폼 필드별 에러 표시                        |
| 503  | 백프레셔(과부하)           | `Retry-After` 존중 + 재시도 안내           |

<br>

## 4. 모듈 구성

```
src/
├── main.tsx              # StrictMode > QueryClientProvider > AuthProvider > RouterProvider + <Toaster richColors top-center>
├── index.css            # shadcn 토큰 (CSS 변수)
├── lib/                 # 도메인 무관 인프라 (apiClient · 토큰 · 에러 · 폼/포맷 헬퍼)
├── components/          # 공통 UI (ui/ shadcn · layout/ · EmptyState · Pagination · QueryErrorState)
├── features/            # 도메인 수직 슬라이스 (auth · events · reservations · payments · queue · users)
├── hooks/               # 도메인 무관 공통 훅 (usePageParam · useSettlementQuery)
├── pages/               # 라우트 단위 화면 (대부분 +test)
├── routes/              # router.tsx · ProtectedRoute.tsx
├── types/               # API 타입 (common Page<T> · auth · event · reservation · payment · queue · error · user)
└── test/                # setup.ts · utils.tsx · msw/{server,handlers}
```

| 레이어         | 책임                                                         | 세부 README                                  |
| -------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `lib/`         | Axios 인스턴스·인터셉터, 토큰 저장, 에러 정규화, 순수 헬퍼   | [src/lib/README.md](src/lib/README.md)             |
| `components/`  | shadcn 원자(ui/), 레이아웃, 공통 상태 컴포넌트               | [src/components/README.md](src/components/README.md) |
| `features/`    | 도메인별 `api·hooks·schema·components` 수직 슬라이스 + 공통 훅 | [src/features/README.md](src/features/README.md)     |

**읽는 순서**: 인프라 → 공통 UI → 도메인 슬라이스 순으로 보면 의존성 방향(`pages → features → lib`)을 따라갑니다.

1. **[lib](src/lib/README.md)** — apiClient · apiError · authToken · reservationToken · captcha · format · queryClient · utils
2. **[components](src/components/README.md)** — ui/ (shadcn) · layout/ · EmptyState · Pagination · QueryErrorState
3. **[features](src/features/README.md)** — auth · events · reservations · payments · queue · users + `usePageParam` · `useSettlementQuery`

<br>

## 5. 실행 방법

### 사전 요구

- Node.js ≥ 20, pnpm 9.15.9
- 백엔드([`cc/app`](../app))가 `localhost:8020` 에서 기동 중일 것

### 설치 · 스크립트

```bash
pnpm install
pnpm dev            # 개발 서버 (Vite)
pnpm build          # tsc -b && vite build (타입체크 후 프로덕션 번들)
pnpm preview        # 빌드 결과 미리보기
pnpm test           # vitest run
pnpm test:coverage  # v8 커버리지
pnpm lint           # eslint .
pnpm typecheck      # tsc -b
pnpm format         # prettier
```

### 환경 변수 (`.env.example` → `.env`)

```bash
VITE_API_BASE_URL=http://localhost:8020
VITE_CAPTCHA_ENABLED=false
```

> `.env` 는 커밋하지 않습니다. `VITE_` 접두사 변수만 클라이언트 번들에 노출되므로 비밀값을 두지 않습니다.

### 배포

`web-cd.yml` 워크플로(main 으로 머지된 PR 종료 또는 수동 트리거)가 처리합니다.

1. repo variables(`VITE_API_BASE_URL` · `VITE_CAPTCHA_ENABLED` · `S3_BUCKET_NAME`) 검증
2. `pnpm build` — 빌드타임에 env 주입
3. AWS 자격 증명(`ap-northeast-2`) → S3 sync (자산 `max-age` immutable, `index.html` no-cache)
4. CloudFront 무효화 (distribution ID 동적 조회)

> CI: `web-ci.yml`(PR → main: install `--frozen-lockfile` → lint → typecheck → test → build), `convention_check.yml`(commit-lint + pr-title-lint).

<br>

## 6. 컨벤션 합의 사항

협업 규약은 [`.github`](.github) 의 이슈·PR 템플릿과 `convention_check.yml` 을 단일 출처로 합니다. CI 가 커밋·PR 제목 형식을 강제합니다.

### 이슈

제목 형식: `[카테고리] 제목` (full-word 대문자)

| 카테고리     | 라벨       |
| ------------ | ---------- |
| `[FEATURE]`  | `feature`  |
| `[BUG]`      | `bug`      |
| `[REFACTOR]` | `refactor` |
| `[CHORE]`    | `chore`    |

### 브랜치

`카테고리/#이슈번호/브랜치명` — 예: `feature/#12/event-detail-page`

### 커밋

`[카테고리]: 변경 내용` (한국어) — CI 강제 카테고리 **5개**: **`FEAT` · `FIX` · `REFAC` · `DOCS` · `CHORE`**

> ⚠️ 백엔드(`cc/app`)와 달리 web 의 커밋·PR 카테고리에는 **`DOCS` 가 포함**됩니다.

```
[FEAT]: 행사 목록 페이지 + 페이지네이션
[DOCS]: README 모듈 구조 정리
```

### Pull Request

`[카테고리#이슈번호] 제목` (콜론 없음) — 예: `[FEAT#12] 행사 상세 + 예매 액션`. 본문은 PR 템플릿(Summary / Changes / Review Points) 준수.

### 코드 스타일

- 컴포넌트 `PascalCase`, 훅 `useXxx`, 변수·함수 `camelCase`, 상수 `UPPER_SNAKE_CASE`
- 주석·커밋·PR 은 **한국어 단일** (식별자·외부 라이브러리 인용은 예외)
- 서버 데이터는 직접 fetch 대신 **TanStack Query 훅**으로 캡슐화

<br>

## 7. 팀원 작업 역할

| 팀원                | 담당                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| **juhy0987 (김주현)** | 앱 코드 거의 단독 — `features` · `components` · `lib` · `hooks` · `pages` · `routes` 전반 (PR 24개 중 23개) |
| **hjh1346**         | CI/CD 워크플로 (`#11`/`#14` web CI/CD)                                            |

<br>

## 8. 참고

- 백엔드: [`cc/app`](../app) — FastAPI 티켓팅 API · 문서 <http://localhost:8020/docs>
- 개발 룰셋: [`.claude/rules`](.claude/rules) (아키텍처·API 연동·상태·에러·테스트·코드 스타일·워크플로·디자인·성능)
- 협업 규약: [`.github`](.github)
- 모듈 README: [lib](src/lib/README.md) · [components](src/components/README.md) · [features](src/features/README.md)
</content>
</invoke>
