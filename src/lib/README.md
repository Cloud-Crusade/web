# `lib/` — 인프라 계층

## 개요

`lib/` 은 **도메인을 모르는 인프라 코드**만 모은 최하위 레이어입니다. Axios 단일 인스턴스와 인터셉터, 토큰 저장, 에러 정규화, 캡차 솔버, 날짜 포맷, QueryClient, 순수 헬퍼가 여기에 있습니다. 의존성 방향상 `features/` 와 `components/` 가 `lib/` 를 import 하며, **그 역방향(lib → features)은 금지**입니다.

특정 엔티티(`event`, `reservation`) 이름이 들어가는 코드는 `lib/` 가 아니라 해당 `features/<domain>/` 으로 갑니다. 단, 대기열 입장 토큰(`reservationToken`)은 인터셉터(`apiClient`)가 헤더로 주입해야 하는 **인프라 관심사**라 예외적으로 `lib/` 에 둡니다.

<br>

## 설계 원칙 & 고려 사항

- **단일 Axios 인스턴스** — 모든 도메인이 `apiClient` 하나를 공유합니다. 인증/비인증 인스턴스로 쪼개지 않고, 토큰 주입은 인터셉터가 분기합니다.
- **토큰·에러는 단일 출처** — `localStorage` 접근은 `authToken`/`reservationToken` 한 곳, Axios 에러 → `ApiError` 변환은 `toApiError` 한 곳에 모읍니다. 컴포넌트가 `localStorage` 를 직접 읽거나 `error as any` 캐스팅하지 않습니다.
- **에러는 흘려보낸다** — `apiClient`/api 모듈은 에러를 정규화만 하고 삼키지 않습니다. 해석·표시는 Query 훅과 `QueryErrorState`/전역 토스트의 책임입니다.
- **비밀값 없음** — `VITE_` env 와 `localStorage` 토큰만 다루며, 비밀값은 프론트에 존재하지 않습니다.

<br>

## 구성

```
src/lib/
├── apiClient.ts          # Axios 인스턴스 + 요청/응답 인터셉터 (토큰 주입 · 401 refresh)
├── apiClient.test.ts
├── apiError.ts           # ApiError 클래스 + toApiError + 상태/코드 가드
├── authToken.ts          # access/refresh 토큰 localStorage 단일 모듈
├── reservationToken.ts   # 대기열 입장 토큰 (JWT exp 만료 판정)
├── reservationToken.test.ts
├── captcha.ts            # ALTCHA PoW 솔버 (Web Crypto SHA-256)
├── captcha.test.ts
├── format.ts             # Intl.DateTimeFormat ko-KR 날짜 포맷
├── format.test.ts
├── queryClient.ts        # QueryClient 설정 + MutationCache 전역 에러 토스트
└── utils.ts              # cn()
```

| 파일                 | 책임                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `apiClient.ts`       | baseURL(`VITE_API_BASE_URL`)·timeout(10s), `Authorization` + `RESERVATION` 헤더 자동 주입, 401 자동 refresh·재시도, 에러 `toApiError` 정규화 |
| `apiError.ts`        | `ApiError`(status·code·details), `toApiError`, 가드(`isUnauthorized`/`isNotFound`/`isSeatTaken`/`isValidation`/`isBackpressure`) |
| `authToken.ts`       | `cc.access` / `cc.refresh` 저장·조회·정리 (`getAccessToken`/`setTokens`/`clearTokens`)     |
| `reservationToken.ts`| `cc.reservation` 대기열 입장 토큰 저장, JWT `exp` 파싱으로 만료 판정                          |
| `captcha.ts`         | ALTCHA Proof-of-Work 챌린지를 Web Crypto SHA-256 으로 푸는 솔버 (`X-Captcha-Token` 생성)     |
| `format.ts`          | `Intl.DateTimeFormat` 기반 `ko-KR` 날짜 포맷 (표시 시점에만 변환, `Date` 강제 변환 안 함)    |
| `queryClient.ts`     | `staleTime` 30s · `gcTime` 5m · retry 정책, `MutationCache.onError` 전역 토스트              |
| `utils.ts`           | `cn()` — `clsx` + `tailwind-merge` 조건부·충돌 클래스 머지                                   |

<br>

## 핵심 로직 / 동작

### `apiClient` — 토큰 주입 + 401 자동 refresh

- **요청 인터셉터**: `getAccessToken()` 이 있으면 `Authorization: Bearer` 를 붙이고, 대기열 입장 토큰이 있으면 `RESERVATION` 헤더를 자동 주입합니다. 개별 호출에서 헤더를 손으로 달지 않습니다.
- **응답 인터셉터 (401 처리)**:
  - 동시에 여러 요청이 401 을 받아도 **단일 `refreshPromise` 를 공유**해 refresh 를 1회만 수행합니다(토큰 레이스 방지).
  - refresh 자체는 **raw `axios`** 로 호출해 인터셉터 재귀(refresh 요청이 또 토큰을 붙여 401 루프)를 방지합니다.
  - `_retried` 플래그로 재시도한 요청이 또 401 이면 무한 루프 대신 즉시 실패시킵니다.
  - 인증 경로(`/auth/login|signup|refresh`)의 401 은 refresh 대상에서 **제외** — 폼 에러로 처리합니다.
  - refresh 토큰이 없으면 토큰 정리만, refresh 실패 시 `clearAuthAndReload()`(토큰·예매 토큰 정리 후 `window.location.reload()`)로 **새로고침** 합니다. `/login` 리다이렉트 대신 새로고침 후 라우트 가드가 처리하게 합니다.
  - 모든 에러는 `toApiError` 로 정규화되어 Query 훅이 항상 `ApiError` 로 분기합니다.

### `apiError` — 정규화 단일 출처

`AxiosError`(또는 네트워크 실패)를 `ApiError`(status·code·details) 한 타입으로 변환합니다. `response` 가 없으면 `NETWORK_ERROR`(status 0)로 매핑합니다. 가드 함수(`isUnauthorized`/`isNotFound`/`isSeatTaken` 등)로 상태·코드 분기를 통일해, 화면에는 `message` 만 노출하고 `code` 는 분기·로깅 전용으로 씁니다.

### `reservationToken` — 대기열 입장 토큰

대기열 `COMPLETED` 시 발급되는 입장 토큰을 `cc.reservation` 에 저장합니다. JWT `exp` 를 파싱해 만료를 판정하며, 만료 시 재대기열 대상이 됩니다(`exp` 없는 토큰은 서버 위임). 이 토큰을 `apiClient` 가 `RESERVATION` 헤더로 자동 주입해 예매 경로를 보호합니다.

### `captcha` — ALTCHA PoW 솔버

`VITE_CAPTCHA_ENABLED` 가 켜지면, 예매 생성 시 ALTCHA Proof-of-Work 챌린지를 Web Crypto `SHA-256` 으로 풀어 `X-Captcha-Token` 을 만들어 첨부합니다.

### `queryClient` — 전역 캐시·에러 정책

`staleTime` 30s · `gcTime` 5m 의 기본값과 retry 정책(4xx 비재시도)을 두고, `MutationCache.onError` 로 write 실패를 전역 토스트(한 동작 한 토스트)로 처리합니다. 폼 422·좌석 409 등 인라인 처리가 필요한 케이스는 컴포넌트가 추가로 다룹니다.

<br>

⬆ [web 대표 README로](../../README.md)
</content>
