# 티켓팅 웹 프론트엔드 개발 룰셋

이 디렉토리는 **팀 C.C (Cloud Crusade) 티켓팅 서비스의 웹 프론트엔드 (`cc/web`)** 개발 룰셋입니다. 본 웹앱은 백엔드 [`cc/app`](../../README.md) 의 FastAPI API 를 소비하는 **단일 페이지 애플리케이션(SPA)** 으로, **인증 · 행사 관리 · 티켓팅(예매/결제)** 기능을 사용자에게 노출합니다.

> 백엔드 룰셋([`cc/app/.claude/rules`](../../../app/.claude/rules))을 웹 영역에 맞게 적용한 것입니다. 백엔드 전용 관심사(다중 RDS·AWS 인프라)는 프론트엔드 관심사(SPA 아키텍처·API 연동·디자인 시스템·렌더 성능)로 치환했습니다.

## 시스템 범위 (필독)

본 웹앱은 백엔드 API 가 제공하는 기능만 노출합니다.

1. **인증** — 회원가입 · 로그인 · 토큰 갱신 · 내 정보
2. **행사 관리** — 행사 등록 · 조회 · 수정 · 삭제
3. **티켓팅** — 예매 요청/취소(비동기) · 내 예매 조회 · 결제 요청(비동기) · 결제 내역 조회

### 명시적으로 다루지 않는 것
- **관리자 대시보드 · 통계 · 권한 분리 X** — 백엔드에 역할 구분이 없음
- **추천 · 검색 · 필터 고도화 X**
- **알림 · 이메일 · 실시간 푸시 X**
- **결제 PG 위젯 X** — `payment_method` 는 문자열 기록만 (백엔드가 Mock)

> 기능 추가 제안이 들어와도 "API 범위 내 + 디자인·기능 배치 집중" 정체성을 우선합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 빌드·번들러 | Vite |
| UI · 언어 | React + TypeScript (SPA) |
| 라우팅 | React Router |
| 스타일링 | Tailwind CSS |
| 컴포넌트 | shadcn/ui (Radix 기반) |
| 서버 상태 | TanStack Query (React Query) |
| HTTP | Axios (인터셉터로 토큰 주입·갱신) |
| 폼·검증 | React Hook Form + Zod |
| 테스트 | Vitest + React Testing Library + MSW |
| 린트·포맷 | ESLint + Prettier + tsc |
| 패키지 매니저 | pnpm |

### 백엔드 연동 단일 사실
- **API base**: `http://localhost:8020` (env `VITE_API_BASE_URL`) · Swagger `/docs`
- **인증**: JWT access(30분) + refresh(14일), `Authorization: Bearer`
- **비동기 write**: 예매·결제 생성/취소는 `202 Accepted` + 식별자 즉시 반환(SQS→Lambda) → 단건 조회 폴링으로 반영
- **표준 에러**: `{ code, message, details }` (401/404/409/422/503)

## 룰셋 구성

| 파일 | 내용 |
|---|---|
| [01-architecture.md](01-architecture.md) | SPA 아키텍처 · feature 기반 디렉토리 · 레이어/의존성 방향 · 라우팅 · 환경설정 |
| [02-api-integration.md](02-api-integration.md) | Axios 클라이언트 · 토큰 인터셉터 · 도메인 api 모듈 · 비동기 202 폴링 · 페이지네이션 |
| [03-state-and-data.md](03-state-and-data.md) | 서버 상태 vs 클라이언트 상태 · TanStack Query 패턴 · 캐시 무효화 · 폼(RHF+Zod) |
| [04-error-handling.md](04-error-handling.md) | ErrorBoundary · API 에러 매핑 · 로딩/빈/에러 상태 · 401·503 처리 |
| [05-testing.md](05-testing.md) | Vitest + RTL + MSW · 테스트 구조 · 커버리지 · 비동기 테스트 |
| [06-code-style.md](06-code-style.md) | TS/React 컨벤션 · 네이밍 · Tailwind 사용 규칙 · 주석 한국어 · Git 컨벤션 |
| [07-workflow.md](07-workflow.md) | 이슈 먼저 · 자율 진행 정책 · commit-per-TODO · PR 자동 생성 · 라벨 |
| [08-design-system.md](08-design-system.md) | shadcn/ui · Tailwind 토큰 · 반응형 · 접근성 · 상태 가시화 · 디자인 원칙 |
| [09-performance.md](09-performance.md) | 코드 스플리팅 · 번들 최적화 · 캐싱 전략 · 스파이크 UX · 렌더 최적화 |

## Quick Start

### 새 개발자
1. **시작**: [01-architecture.md](01-architecture.md) — 전체 그림과 디렉토리
2. **스타일**: [06-code-style.md](06-code-style.md) — 작성 규칙
3. **흐름**: [02-api-integration.md](02-api-integration.md) → [03-state-and-data.md](03-state-and-data.md)

### 작업 유형별
- **새 화면/기능 추가**: [01](01-architecture.md) → [02](02-api-integration.md) → [03](03-state-and-data.md) → [08](08-design-system.md) → [05](05-testing.md)
- **API 연동 추가**: [02](02-api-integration.md) → [03](03-state-and-data.md) → [04](04-error-handling.md)
- **디자인·컴포넌트 작업**: [08](08-design-system.md) → [06](06-code-style.md)

## 프로젝트 성격 — 간략화 원칙 (필독)

본 프로젝트는 **API 범위 내에서 디자인과 효율적 기능 배치에 집중**합니다. 과한 추상화·미래 확장 일반화는 금지합니다.

### 금지 사항
- **계층을 위한 계층 금지** — `pages / features / components / lib` 외 임의 레이어 도입 금지
- **상태관리 라이브러리 추가 금지** — 서버 상태는 TanStack Query, 클라 전역 상태는 인증 정도. Redux 등 도입 X
- **추상화 우선 설계 금지** — 두 번째 사용처가 생길 때 공통화 (3번 반복 시 추출)
- **API 범위 밖 기능 금지** — 위 "시스템 범위" 외 화면·기능 추가 금지
- **장황한 주석 금지** — WHY 가 비자명할 때만 한 줄

### 권장 사항
- **서버 상태는 Query 훅으로 캡슐화** — 컴포넌트에서 직접 fetch 금지
- **단순 직선 흐름 우선** — `page → feature hook → api → 서버`
- **무엇이든 의심스러우면 더 단순한 쪽으로** — 룰 충돌 시 간략화 원칙 우선

## 핵심 원칙

1. **서버 상태와 UI 상태 분리** — 서버 데이터는 TanStack Query, 파생 데이터는 메모이즈, 전역 클라 상태 최소
2. **레이어 분리** — page 는 레이아웃·조합, feature hook 은 데이터·로직, api 모듈은 HTTP 만, 컴포넌트는 표현
3. **비동기 write 가시화** — 202 기반 예매·결제의 "처리 중 / 완료 / 실패" 를 명확히 노출
4. **타입 안전** — API 응답·폼은 타입/Zod 스키마로 검증, `any` 회피
5. **테스트와 함께** — 신규 기능은 RTL + MSW 테스트 동반

## 협업 컨벤션 (web 단일 출처)

[`.github`](../../.github) 의 이슈·PR 템플릿과 `convention_check.yml` 을 단일 출처로 합니다. 자세한 내용은 [07-workflow.md](07-workflow.md), [06-code-style.md](06-code-style.md) 참조.

| 위치 | 형식 | 예시 |
|---|---|---|
| Issue | `[FEATURE]`/`[BUG]`/`[CHORE]`/`[REFACTOR]` | `[FEATURE] 행사 상세 + 예매 액션` |
| Commit | `[FEAT]:`/`[FIX]:`/`[REFAC]:`/`[DOCS]:`/`[CHORE]:` | `[FEAT]: 행사 목록 페이지` |
| Branch | `카테고리/#이슈번호/브랜치명` | `feature/#12/event-detail` |
| PR | `[FEAT#N]`/`[FIX#N]`/`[REFAC#N]`/`[DOCS#N]`/`[CHORE#N]` | `[FEAT#12] 행사 상세` |

> ⚠️ 백엔드(`cc/app`)와 달리 web 은 커밋 카테고리에 **`DOCS`** 를 포함합니다.

---

**원칙**: 룰은 일관성·품질·유지보수성을 위해 존재합니다. 모호하면 룰을 따르고, 룰이 커버하지 못하면 그것이 룰을 개선할 기회입니다.
