# `features/` — 도메인 수직 슬라이스 계층

## 개요

`features/` 는 백엔드 도메인을 그대로 미러링한 **수직 슬라이스** 계층입니다. 각 도메인은 `api.ts`(HTTP) · `hooks.ts`(TanStack Query) · `schema.ts`(Zod) · `components/`(도메인 UI) 네 단위로 캡슐화됩니다. 컴포넌트는 `hooks.ts` 만 import 하고 `api.ts` 를 직접 부르지 않습니다.

여기에 더해, 룰셋 도메인(`auth/users · events · reservations · payments`) 외에 **대기열(`queue`)** 슬라이스를 추가했습니다(스파이크 게이트). 그리고 도메인 무관 공통 훅(`usePageParam` · `useSettlementQuery`)은 `src/hooks/` 에 두고 여러 도메인이 공유합니다.

<br>

## 설계 원칙 & 고려 사항

- **수직 슬라이스 = 도메인 미러** — 백엔드 경계를 디렉토리로 그대로 옮겨 탐색 비용을 낮춥니다. 도메인 간 협력은 feature 끼리가 아니라 `page` 레벨에서 각 훅을 조합합니다.
- **queryKey 팩토리** — 도메인마다 `hooks.ts` 상단에 `eventKeys`/`reservationKeys`/… 팩토리를 두어 무효화 누락·오타를 막습니다.
- **`enabled` 가드** — 인증 필요 쿼리는 `enabled: isAuthenticated`, 필수 파라미터는 `enabled: !!id` 로 끕니다.
- **`keepPreviousData`** — 목록 페이지 이동 시 깜빡임을 막습니다.
- **무효화 규칙** — mutation `onSuccess` 에서 `invalidateQueries`(생성 → all, 수정 → detail + all, 삭제 → `removeQueries` + all).
- **서버 상태 우선** — 서버 데이터는 Query, 전역 클라 상태는 `AuthContext` 하나, URL 은 `usePageParam`, 로컬은 `useState`. Redux/Zustand 없음.
- **202 정착은 폴링** — 비동기 write 는 단정하지 않고 단건 GET 폴링으로 반영을 확인합니다([useSettlementQuery](#공통-훅)).

<br>

## 구성

```
src/features/
├── auth/          api.ts hooks.ts schema.ts(+test) AuthContext.tsx
├── events/        api.ts hooks.ts(+test) schema.ts(+test) components/{EventCard,EventImage,EventForm,EventActions}
├── reservations/  api.ts hooks.ts schema.ts components/{ReservationCard,ReservationStatusBadge,ReserveAction}
├── payments/      api.ts hooks.ts schema.ts components/{PaymentCard,PayAction}
├── queue/         api.ts hooks.ts QueueGate.tsx
└── users/         api.ts hooks.ts

src/hooks/         usePageParam.ts(+test)  useSettlementQuery.ts(+test)   # 도메인 무관 공통 훅
```

| 도메인         | api                                                            | 주요 hooks                                                                                  | schema / 기타                                                            |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `auth`         | `login`, `signup`                                             | `useLogin`(onSuccess → `login`), `useSignup`                                                 | `loginSchema`(user_name ≤255, password ≤72), `signupSchema`; `AuthContext`(유일한 전역 클라 상태) |
| `events`       | `list`/`get`/`create`/`update`(PATCH)/`remove`(DELETE)        | `eventKeys`, `useEvents`(keepPreviousData), `useEvent`, `useCreate`/`useUpdate`/`useDelete`  | `eventCreate/Update` + `eventFormSchema`(datetime-local) + `toEventPayload`/`isoToDateTimeLocal` |
| `reservations` | `list`/`get`/`occupiedSeats`(`/seats/occupied?event_id`)/`create`(X-Captcha-Token)/`cancel` | `reservationKeys`, `useOccupiedSeats`, `useMyReservations`, `useReservationStatus`, `useCreate`/`useCancel` | `reservationCreate`(event_id, reserved_num ≥1 = 좌석번호)                |
| `payments`     | `list`/`get`/`create`                                          | `paymentKeys`, `useMyPayments`, `usePayment`, `usePaymentStatus`, `useCreatePayment`         | `paymentCreate`(reservation_id, payment_method 1~20자)                   |
| `queue`        | `getStatus`(GET `/queue/:eventId`)                            | `queueKeys`, `isQueueCompleted`/`isQueueAdmitted`, `useQueueStatus`(2초 폴링)                | `QueueGate.tsx`(라우트 게이트)                                           |
| `users`        | `me`                                                          | `userKeys.me`, `useMe`                                                                       | —                                                                        |

### 도메인 components

- **events** — `EventCard`, `EventImage`(폴백), `EventForm`, `EventActions`(수정/삭제 `AlertDialog`)
- **reservations** — `ReservationCard`, `ReservationStatusBadge`(처리중/완료/취소됨, `aria-live`), `ReserveAction`
- **payments** — `PaymentCard`, `PayAction`(결제 + 202 폴링)

<br>

## 핵심 로직 / 동작

### auth — 전역 클라 상태 하나

`AuthContext` 는 본 앱의 **유일한 전역 클라이언트 상태**입니다. `isAuthenticated`/`login`/`logout`/`syncAuth` 를 제공하며, `useLogin` 의 `onSuccess` 가 토큰 저장 후 `login` 을 호출합니다. `syncAuth` 는 `AppLayout` 의 페이지 이동마다 호출되어 인터셉터/다른 탭의 토큰 변화를 반영합니다.

### events — CRUD + 폼 변환

목록은 `keepPreviousData` 로 페이지 깜빡임을 막고, 무효화는 생성 → `all`, 수정 → `detail` + `all`, 삭제 → `removeQueries` + `all` 규칙을 따릅니다. 폼은 백엔드 ISO 스케줄과 브라우저 `datetime-local` 사이를 `toEventPayload`/`isoToDateTimeLocal` 로 변환합니다. `EventActions` 는 파괴적 액션을 `AlertDialog` 로 확인합니다.

### reservations / payments — 202 정착 흐름

예매·결제 생성은 `202` + 식별자만 받습니다. `ReserveAction`/`PayAction` 이 식별자를 보관하고 `useReservationStatus`/`usePaymentStatus`(둘 다 `useSettlementQuery` 기반)로 단건을 폴링해 정착을 확인합니다. 좌석은 `reserved_num` 이 **좌석 번호**이며, `useOccupiedSeats`(`/seats/occupied?event_id`)로 점유 좌석을 조회합니다. 생성 시 `X-Captcha-Token`(ALTCHA)을 첨부합니다. `ReservationStatusBadge` 는 처리중/완료/취소됨을 `aria-live` 로 안내합니다.

### queue — 대기열 게이트 (룰셋 외 추가 도메인)

행사 상세는 `QueueGate` 로 감쌉니다. `useQueueStatus` 가 `GET /queue/:eventId` 를 **2초 간격으로 폴링**하다가 `COMPLETED` 가 되면 폴링을 멈추고, 발급 토큰을 즉시 `setReservationToken` 으로 저장합니다(렌더 레이스 없이 게이트·인터셉터가 같은 토큰을 보게). 에러(네트워크/401/500) 시 폴링을 중단해 재시도 스팸을 막고 `QueuePage` 가 에러 UI 를 노출합니다. 보호는 **3계층**입니다 — 공개 → `QueueGate`(`events/:eventId` 감쌈, 미입장 시 대기열로) → `ProtectedRoute`. `isQueueAdmitted` 는 `COMPLETED` + 만료 안 된 입장 토큰 보유를 함께 판정합니다(토큰 만료 시 재대기열).

<br>

## 공통 훅

> 위치: `src/hooks/` — 도메인 무관 공통 훅

### `usePageParam` — URL 페이지 단일 출처

목록 페이지 번호를 URL `?page` 하나로 관리합니다. 잘못된 값은 `1` 로 폴백하고, `goToPage` 가 값을 정규화해 `setSearchParams` 합니다. 컴포넌트는 페이지를 state 로 들지 않으므로 뒤로가기·공유·`queryKey` 미러링이 자동입니다.

### `useSettlementQuery` — ★ 202 정착 폴링 공통 훅

예매·결제 **두 도메인이 공유하는 핵심 훅**입니다. 비동기 write 후, 단건 GET 이 `200 success` 로 잡힐 때까지 폴링해 "정착(settlement)" 을 확인합니다.

**동작:**

- **정착 판정** — 단건 GET 이 `success` 면 폴링을 멈춥니다. 미정착(202 직후 아직 없으면 `404`)이면 계속 폴링합니다.
- **`refetchInterval`** — `success` → `false`(종료), 타임아웃 초과 → `false`(종료), 그 외 → `intervalMs` 반환(예매·결제 기본 1.5s).
- **타임아웃 = '지연' 구분** — `timeoutMs`(기본 30s) 내 미정착이면 `hasTimedOut` 을 켭니다. 이는 **'실패' 가 아니라 '지연'** 입니다(202 라 나중에 반영될 수 있음). 화면은 "처리가 지연되고 있어요, 내역에서 확인" 으로 안내합니다.
- **`resetKey` 리셋** — 폴링 대상 식별자(`resetKey`)가 바뀌면 effect 에서 `startedAt`·`hasTimedOut` 을 리셋하고 `epoch` 를 증가시켜 타임아웃 타이머를 재스케줄합니다. 이로써 페이지를 오래 열어둔 뒤 새 대상으로 시작해도 즉시 타임아웃되지 않습니다(마운트 시점 고정 회피).
- **`retry`** — 사용자가 재시도하면 `startedAt`·`hasTimedOut` 리셋 + `epoch` 증가로 폴링과 타임아웃 타이머를 함께 재개합니다.

```ts
// 반환
type Result<T> = {
  data: T | undefined;
  isSettled: boolean;   // 단건이 200 success 로 정착됨
  hasTimedOut: boolean; // 타임아웃 내 미정착 = '지연'
  retry: () => void;
};
```

> 과거 `lib/poll.ts` 의 명령형 폴링 헬퍼를 제거하고(#48), 이 훅으로 통합하면서 202 직후 404 깜빡임을 해소하고 타임아웃 리셋을 effect/epoch 로 정리했습니다. `useReservationStatus`·`usePaymentStatus` 가 모두 이 훅을 감쌉니다.

<br>

⬆ [web 대표 README로](../../README.md)
</content>
