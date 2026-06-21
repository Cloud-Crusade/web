# `components/` — 공통 UI 계층

## 개요

`components/` 는 **도메인 무관 공통 UI** 를 담는 계층입니다. shadcn/ui 가 생성한 Radix 기반 원자(`ui/`), 화면 골격(`layout/`), 그리고 여러 도메인이 함께 쓰는 상태 컴포넌트(`EmptyState`/`Pagination`/`QueryErrorState`)로 구성됩니다. 한 도메인 안에서만 쓰는 표현 컴포넌트는 여기가 아니라 [`features/<domain>/components`](../features/README.md) 로 갑니다.

<br>

## 설계 원칙 & 고려 사항

- **계층 분리** — `ui/` 는 토큰 기반 무상태 프리미티브(원자) 전용입니다. `ui/` 안에 직접 만든 도메인 컴포넌트를 넣지 않고, 원자 조합은 상위(`features` / `pages`)에서 합니다.
- **상태 가시화 우선** — 본 프로젝트 최대 책임. 로딩 / 빈 / 에러 / 처리 중 4 상태를 항상 노출합니다. `EmptyState`·`QueryErrorState` 가 그 공통 표현입니다.
- **3번 반복 시 추출** — 도메인 무관 반복 마크업(빈 상태, 페이지네이션, 에러 상태)만 이 계층으로 끌어올립니다. "나중에 쓸지 모르니" 식으로 props 를 미리 늘리지 않습니다.
- **shadcn 원본 보존** — `ui/*` 를 fork 해 고치면 향후 `add` 재실행·업그레이드가 어려워집니다. 토큰·variant(cva)로 해결되면 원본을 건드리지 않습니다.
- **접근성** — Radix 기본 동작(포커스 트랩·Esc·aria)을 깨뜨리지 않는 것이 핵심입니다.

<br>

## 구성

```
src/components/
├── EmptyState.tsx          # 아이콘 + 제목 + 설명 + action 슬롯
├── Pagination.tsx          # 이전/다음 + page/lastPage 표시
├── QueryErrorState.tsx     # 조회 실패 표현 (404 강등 / 재시도)
├── QueryErrorState.test.tsx
├── layout/
│   ├── AppLayout.tsx       # Header + main(max-w-screen-lg) + footer, 페이지 이동마다 syncAuth
│   ├── AppLayout.test.tsx
│   └── Header.tsx          # 스티키 헤더, 인증 상태별 NavLink
└── ui/                     # shadcn 전용 (Radix 기반 원자)
    ├── alert-dialog.tsx  badge.tsx  button.tsx  card.tsx
    ├── form.tsx  input.tsx  label.tsx  skeleton.tsx  sonner.tsx
```

| 컴포넌트            | 책임                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `EmptyState`        | 목록이 비었을 때 아이콘 + 제목 + 설명 + 다음 액션(`action`)을 제시                          |
| `Pagination`        | 이전/다음 버튼 + 현재 `page` / `lastPage`. 페이지 상태는 URL(`usePageParam`)이 단일 출처    |
| `QueryErrorState`   | 조회 실패 표현 — 404 는 `EmptyState` 로 강등, 그 외는 재시도 버튼(`onRetry` 인자 차단)      |
| `layout/AppLayout`  | 화면 골격(`Header` + `main` `max-w-screen-lg` + footer), `useLayoutEffect` 로 페이지 이동마다 `syncAuth` |
| `layout/Header`     | 스티키 헤더, 인증 상태별 `NavLink`(비로그인: 로그인/회원가입, 로그인: 목록·예매·결제·내정보·로그아웃) |
| `ui/*`              | shadcn new-york/zinc 원자 — `alert-dialog`·`badge`·`button`·`card`·`form`·`input`·`label`·`skeleton`·`sonner` |

<br>

## 핵심 로직 / 동작

### `QueryErrorState` — 404 강등 + 재시도

조회 실패의 공통 표현입니다. `toApiError` 로 정규화한 뒤 **404 는 에러가 아니라 빈 상태**(없음 / 본인 것 아님)로 보고 `EmptyState` 로 강등합니다. 그 외 에러는 `message` 와 함께 "다시 시도" 버튼을 노출하며, `onRetry` 에 이벤트 인자가 새지 않도록 차단합니다(React Query `refetch` 직접 연결 시 인자 오염 방지). 목록·단건 조회의 `isError` 분기에서 재사용됩니다.

### `Pagination` — URL 단일 출처

페이지 번호를 컴포넌트 state 로 들지 않습니다. 현재 `page`·`lastPage`(= `Math.ceil(total / size)`)를 props 로 받아 이전/다음 버튼만 렌더하고, 실제 페이지 이동은 `usePageParam` 의 `goToPage` 가 URL `?page` 를 갱신합니다. 덕분에 뒤로가기·공유·`queryKey` 미러링이 공짜로 따라옵니다.

### `AppLayout` / `Header` — 인증 동기화

`AppLayout` 은 단일 레이아웃 라우트로 모든 페이지를 감싸고, `useLayoutEffect` 로 **페이지 이동마다 `syncAuth`** 를 호출해 다른 탭/인터셉터의 토큰 변화를 인증 컨텍스트에 반영합니다(401 최종 실패 시 새로고침과 짝). `Header` 는 `isAuthenticated` 에 따라 노출 `NavLink` 를 분기합니다.

### `EmptyState` — 빈 상태 + 다음 액션

"아무것도 안 보이는 빈 화면" 을 버그로 취급하는 정책의 표현입니다. 아이콘(lucide)·제목·설명에 더해 `action` 슬롯으로 "행사 둘러보기" 같은 다음 행동을 제시합니다.

<br>

⬆ [web 대표 README로](../../README.md)
</content>
