# C.C Ticketing Web

팀 **C.C (Cloud Crusade)** 티켓팅 서비스의 웹 프론트엔드입니다. 백엔드 API([`cc/app`](../app))가 제공하는 **인증 · 행사 관리 · 티켓팅(예매/결제)** 기능을 사용자에게 노출하는 단일 페이지 애플리케이션(SPA)입니다.

> **프로젝트 성격** — 본 웹앱은 백엔드와 동일하게 *AWS 인프라 스파이크 흡수 검증용 티켓팅 서비스*의 클라이언트입니다. 따라서 **API 가 제공하지 않는 기능은 추가하지 않으며**, 화면은 **깔끔한 디자인과 효율적인 기능 배치**에 집중합니다. (관리자 대시보드·통계·추천·검색 고도화·알림 등은 범위 밖)

<br>

## 기술 스택

| 영역            | 기술                              |
| --------------- | --------------------------------- |
| 빌드·번들러     | Vite                              |
| UI 라이브러리   | React (SPA)                       |
| 언어            | TypeScript                        |
| 라우팅          | React Router                      |
| 스타일링        | Tailwind CSS                      |
| 컴포넌트        | shadcn/ui (Radix 기반)            |
| 서버 상태·캐시  | TanStack Query (React Query)      |
| HTTP 클라이언트 | Axios (인터셉터로 토큰 주입·갱신) |
| 폼·검증         | React Hook Form + Zod             |
| 패키지 매니저   | pnpm                              |

> 상태 관리는 **서버 상태(TanStack Query) 우선**. 전역 클라이언트 상태는 인증 토큰·사용자 정보 정도로 최소화합니다.

<br>

## 주요 기능 · 화면 구성

API 도메인을 그대로 정보 구조(IA)에 매핑합니다. 인증이 필요한 화면은 🔒 로 표시합니다.

### 공개 영역

| 화면      | 경로               | 연동 API                                 |
| --------- | ------------------ | ---------------------------------------- |
| 로그인    | `/login`           | `POST /auth/login`, `POST /auth/refresh` |
| 회원가입  | `/signup`          | `POST /auth/signup`                      |
| 행사 목록 | `/events`          | `GET /events` (페이지네이션)             |
| 행사 상세 | `/events/:eventId` | `GET /events/{event_id}`                 |

### 인증 영역 🔒

| 화면             | 경로                              | 연동 API                                                           |
| ---------------- | --------------------------------- | ------------------------------------------------------------------ |
| 행사 등록        | `/events/new`                     | `POST /events`                                                     |
| 행사 수정        | `/events/:eventId/edit`           | `PATCH /events/{event_id}`, `DELETE /events/{event_id}`            |
| 예매하기         | `/events/:eventId` 내 액션        | `POST /reservations` (202 비동기)                                  |
| 내 예매 목록     | `/me/reservations`                | `GET /reservations`                                                |
| 예매 상세 · 취소 | `/me/reservations/:reservationId` | `GET /reservations/{id}`, `DELETE /reservations/{id}` (202 비동기) |
| 결제하기         | 예매 상세 내 액션                 | `POST /payments` (202 비동기)                                      |
| 내 결제 내역     | `/me/payments`                    | `GET /payments`, `GET /payments/{id}`                              |
| 내 정보          | `/me`                             | `GET /users/me`                                                    |

> 행사 등록·수정·삭제는 로그인 사용자라면 누구나 가능합니다(백엔드에 관리자 역할 구분이 없음). 권한 분리는 API 범위 밖이므로 화면에서도 도입하지 않습니다.

<br>

## 백엔드 API 연동

- **기본 URL**: `http://localhost:8020` (로컬 백엔드)
- **Swagger UI**: <http://localhost:8020/docs> · **ReDoc**: `/redoc` · **OpenAPI**: `/openapi.json`
- 백엔드 실행 방법은 [`cc/app`](../app) 참조 (docker-compose 로 PostgreSQL × 2 · Redis 기동).

### 인증 흐름 (JWT)

- 로그인 시 `access_token`(30분) + `refresh_token`(14일)을 발급받습니다.
- 모든 보호 요청은 `Authorization: Bearer <access_token>` 헤더로 전송합니다.
- access 토큰 만료(401) 시 Axios 인터셉터가 `POST /auth/refresh` 로 자동 갱신 후 재시도하고, 갱신도 실패하면 로그인 화면으로 보냅니다.

### 비동기 write 패턴 (예매·결제) — UX 핵심

예매·결제 생성/취소는 **즉시 처리되지 않습니다.** 백엔드가 SQS 로 발행하고 Lambda 가 처리하는 구조라, 요청은 `202 Accepted` 와 함께 식별자만 즉시 반환합니다.

```jsonc
// POST /reservations 응답 (202)
{ "reservation_id": "…", "status": "accepted" }
```

따라서 화면은 다음 패턴으로 처리합니다.

1. 요청 → `202` 수신 → **"처리 중"** 상태로 낙관적 표시
2. 반환된 `reservation_id`(또는 `payment_history_id`)로 단건 조회를 **폴링**하여 반영
3. 좌석 선점 실패 등은 `409`(이미 선점된 좌석) / `404`(이벤트 없음)로 즉시 피드백

> 조회(read)는 동기입니다. 예매 단건·결제 단건 조회는 백엔드에서 캐시 우선(cache-aside)으로 응답하므로 생성 직후에도 일관되게 보입니다.

### 표준 에러 응답

백엔드는 모든 에러를 아래 형식으로 반환합니다. 공통 에러 핸들러에서 `code` 기준으로 토스트·필드 에러를 분기합니다.

```json
{
  "code": "SEAT_ALREADY_TAKEN",
  "message": "이미 선점된 좌석입니다",
  "details": { "event_id": "…" }
}
```

| 상태 | 의미                       | 화면 처리                            |
| ---- | -------------------------- | ------------------------------------ |
| 401  | 인증 필요·토큰 만료        | refresh 재시도 → 실패 시 로그인 이동 |
| 404  | 리소스 없음 / 본인 것 아님 | 빈 상태 또는 목록 복귀               |
| 409  | 좌석 선점 충돌             | 인라인 경고 + 목록 갱신              |
| 422  | 요청 검증 실패             | 폼 필드별 에러 표시                  |
| 503  | 백프레셔(과부하)           | `Retry-After` 존중 + 재시도 안내     |

<br>

## 디렉토리 구조 (제안)

```
src/
├── main.tsx                 # 엔트리, Provider 구성 (Query · Router)
├── App.tsx                  # 라우트 정의
├── lib/
│   ├── apiClient.ts         # Axios 인스턴스 + 토큰 인터셉터
│   └── queryClient.ts       # TanStack Query 설정
├── components/
│   └── ui/                  # shadcn/ui 컴포넌트
├── features/                # 도메인별 모듈 (API 도메인 미러링)
│   ├── auth/                # 로그인·회원가입·토큰
│   ├── events/              # 행사 목록·상세·등록·수정
│   ├── reservations/        # 예매·취소 (비동기 폴링 훅 포함)
│   ├── payments/            # 결제·내역
│   └── users/               # 내 정보
├── hooks/                   # 공통 훅
├── pages/                   # 라우트 단위 페이지
└── types/                   # API 응답 타입
```

> 백엔드의 도메인 경계(`user · event · reservation · payment`)를 프론트의 `features/` 로 그대로 미러링해 탐색 비용을 낮춥니다.

<br>

## 시작하기

### 사전 요구

- Node.js 20 LTS 이상, pnpm
- 백엔드([`cc/app`](../app))가 `localhost:8020` 에서 기동 중일 것

### 설치 · 실행

```bash
pnpm install
pnpm dev          # 개발 서버 (Vite, 기본 http://localhost:5173)
pnpm build        # 프로덕션 번들
pnpm preview      # 빌드 결과 미리보기
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

### 환경 변수 (`.env`)

```bash
VITE_API_BASE_URL=http://localhost:8020
```

> `.env` 는 커밋하지 않습니다. `.env.example` 만 저장소에 포함합니다.

<br>

## 개발 컨벤션

협업 규약은 [`.github`](.github) 의 이슈·PR 템플릿과 `convention_check.yml` 을 단일 출처로 합니다. CI 가 커밋·PR 제목 형식을 강제합니다.

### 이슈

템플릿 준수. 제목 형식: `[카테고리] 제목`

| 카테고리     | 라벨       |
| ------------ | ---------- |
| `[FEATURE]`  | `feature`  |
| `[BUG]`      | `bug`      |
| `[REFACTOR]` | `refactor` |
| `[CHORE]`    | `chore`    |

### 브랜치

`카테고리/#이슈번호/브랜치명` — 예: `feature/#12/event-detail-page`

### 커밋

`[카테고리]: 변경 내용` (한국어) — CI 강제 카테고리: **`FEAT` · `FIX` · `REFAC` · `DOCS` · `CHORE`**

```
[FEAT]: 행사 목록 페이지 + 무한 스크롤
[DOCS]: README 초안 작성
```

### Pull Request

`[카테고리#이슈번호] 제목` — 예: `[FEAT#12] 행사 상세 + 예매 액션`. 본문은 PR 템플릿(Summary / Changes / Review Points) 준수.

### 코드 스타일

- 컴포넌트 `PascalCase`, 훅 `useXxx`, 변수·함수 `camelCase`, 상수 `UPPER_SNAKE_CASE`
- 주석·커밋·PR 은 **한국어 단일** (식별자·외부 라이브러리 인용은 예외)
- 서버 데이터는 직접 fetch 대신 **TanStack Query 훅**으로 캡슐화

<br>

## 디자인 원칙

- **명료함 우선** — 티켓 오픈 순간에도 사용자가 헤매지 않도록 핵심 액션(예매·결제)을 한 번에 도달 가능하게 배치
- **상태 가시화** — 비동기 예매·결제의 "처리 중 / 완료 / 실패"를 명확한 시각 피드백으로 노출
- **일관성** — shadcn/ui 토큰(색·간격·타이포)을 단일 디자인 시스템으로 유지, 컴포넌트 재사용
- **반응형** — 모바일 우선. 목록·상세·폼이 작은 화면에서도 무너지지 않게
- **접근성** — Radix 기반 컴포넌트의 키보드·스크린리더 지원 유지

<br>

## 참고 자료

- 백엔드: [`cc/app`](../app) — FastAPI 티켓팅 API
- API 문서: <http://localhost:8020/docs>
- 협업 규약: [`.github`](.github)
