# 코드 스타일 · 컨벤션

## 핵심 원칙

> **간략화 우선** — 코드는 자신을 설명한다. 장황한 JSDoc·과한 주석·불필요한 추상화는 가독성을 해친다. 본 룰셋의 모든 규칙은 "팀이 빠르게 읽고 이해할 수 있는 코드" 를 위한 것이다.

### 핵심 가치
- **읽기 쉬움 우선** — 영리한 코드보다 명확한 코드
- **자가 설명** — 네이밍으로 의도 표현
- **최소한** — 필요 없으면 안 쓴다 (코드도, 주석도, 추상화도, 컴포넌트도)

## 포맷팅

### 도구

| 도구 | 역할 |
|---|---|
| **ESLint** | linter — 코드 품질·React 규칙·import 정렬 |
| **Prettier** | 포맷터 — 들여쓰기·따옴표·세미콜론·줄바꿈 |
| **prettier-plugin-tailwindcss** | Tailwind 클래스 자동 정렬 |
| **tsc (strict)** | 정적 타입 검사 (`tsc --noEmit`) |

> 역할 분리: **포맷은 Prettier 가, 품질·정렬 규칙은 ESLint 가**. ESLint 의 포맷 규칙은 `eslint-config-prettier` 로 끈다 (둘이 싸우지 않게).

### .prettierrc (권장)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- **세미콜론**: 붙인다 (`semi: true`)
- **따옴표**: 작은따옴표 (`singleQuote: true`) — JSX 속성은 Prettier 가 알아서 큰따옴표
- **줄 길이**: 최대 100자
- **들여쓰기**: 스페이스 2
- **trailing comma**: `all` — diff 최소화

### eslint.config.js (권장 발췌)

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/react-in-jsx-scope': 'off', // 신규 JSX transform
    },
  },
  prettier, // 항상 마지막 — Prettier 와 충돌하는 ESLint 포맷 규칙 비활성
);
```

### 규칙
- **import 정렬은 `simple-import-sort` 가 자동** — 수동 정렬 금지
- **`tsconfig.json` 은 `strict: true`** — `noUncheckedIndexedAccess` 권장
- **CI 게이트**: `tsc --noEmit` + `eslint .` + `prettier --check .` 셋 다 통과 ([05-testing.md](05-testing.md))

## import 순서

`simple-import-sort` 의 그룹 순서를 따른다. 그룹 사이 빈 줄로 구분.

```ts
// 1. 외부 라이브러리 (react, 서드파티)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

// 2. 내부 alias (@/)
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useEventDetail } from '@/features/event/hooks/useEventDetail';

// 3. 상대 경로 (./, ../)
import { EventMeta } from './EventMeta';

// 4. 스타일·에셋 (있으면 마지막)
import './styles.css';
```

### path alias

- **`@/` 는 `src/` 를 가리킨다** — `tsconfig.json` 의 `paths` + Vite `resolve.alias` 동시 설정
- **깊은 상대 경로 금지** — `../../../lib/api` 같은 건 `@/lib/api` 로
- **같은 feature 내부 가까운 파일만 상대 경로** — `./EventMeta` OK

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

## TypeScript

### strict 전제
- **`strict: true`** — 모든 새 코드는 strict 통과 (`strictNullChecks` 포함)
- **`tsc --noEmit` 그린 유지** — 빌드 깨진 채로 commit 금지

### 타입 명시 영역

| 영역 | 규칙 |
|---|---|
| 함수 시그니처 | 매개변수 타입 명시. 반환 타입은 공개 함수·훅에 명시 |
| 컴포넌트 props | `type Props` 로 명시 (아래 React 섹션) |
| 커스텀 훅 반환 | 명시 권장 — 추론이 넓으면 좁혀서 명시 |
| 지역 변수 | 추론에 맡긴다 — 자명하면 명시 안 함 |

```ts
// 좋음 — 시그니처에 타입, 반환 명시
function formatSeatLabel(row: string, no: number): string {
  return `${row}-${no}`;
}

// 나쁨 — 매개변수 타입 누락 (암묵적 any)
function formatSeatLabel(row, no) {
  return `${row}-${no}`;
}
```

### `any` 회피
- **`any` 금지** (`@typescript-eslint/no-explicit-any: error`)
- **정체불명 값은 `unknown` + 타입 가드** — 좁힌 뒤 사용

```ts
// 좋음 — unknown 받아 가드로 좁힘
function isApiError(e: unknown): e is { code: string; message: string } {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}

// 나쁨 — any 로 타입 검사 무력화
function handle(e: any) {
  console.log(e.code); // 컴파일러가 못 잡음
}
```

### 현대 표기법
- **유니온은 `A | B`**, nullable 은 `T | null` / `T | undefined`
- **배열은 `T[]`** (또는 일관되게 `Array<T>` 하나만)
- **`as const`** 로 리터럴 고정 — 매직 문자열 유니온에 유용
- **`satisfies`** 로 타입 만족 검사 (넓힘 없이)

```ts
const RESERVATION_STATUS = ['pending', 'confirmed', 'canceled'] as const;
type ReservationStatus = (typeof RESERVATION_STATUS)[number];
```

### `type` vs `interface`

| 상황 | 선택 |
|---|---|
| props, 유니온, 매핑·유틸리티 타입, 일반 객체 형태 | **`type`** (기본) |
| 라이브러리에 공개하거나 선언 병합(declaration merging) 이 필요 | `interface` |

> 본 프로젝트는 **`type` 을 기본**으로 한다 — 유니온·교차·유틸리티 타입과 일관. `interface` 는 확장 필요가 명확할 때만.

### 제네릭·`as` 절제
- **제네릭은 실제 다형성이 있을 때만** — 한 곳에서만 쓰는 제네릭은 구체 타입으로
- **`as` 단언 최소화** — 컴파일러를 속이는 신호. `as unknown as T` 는 거의 금지
- **`as const` 와 가드는 예외** — 이건 단언이 아니라 좁히기

```ts
// 나쁨 — DOM 캐스팅 남발
const el = document.querySelector('.x') as HTMLInputElement;

// 좋음 — 가드로 좁힘
const el = document.querySelector('.x');
if (el instanceof HTMLInputElement) {
  el.focus();
}
```

## 네이밍 규약

> 본 프로젝트는 **web/README.md 의 네이밍 규약**을 따른다. 아래 표로 명문화한다.

### 식별자

| 대상 | 규약 | 예시 |
|---|---|---|
| 컴포넌트 | PascalCase | `EventCard`, `ReservationButton` |
| 커스텀 훅 | `use` + PascalCase | `useEventDetail`, `useAuth` |
| 변수·함수 | camelCase | `seatLabel`, `formatPrice` |
| 상수 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `POLL_INTERVAL_MS` |
| 타입·인터페이스 | PascalCase | `EventRead`, `ReservationStatus` |
| Boolean | `is`/`has`/`should` 접두 | `isLoading`, `hasError`, `shouldPoll` |

### 파일

| 종류 | 규약 | 예시 |
|---|---|---|
| 컴포넌트 | `PascalCase.tsx` | `EventCard.tsx` |
| 커스텀 훅 | `useXxx.ts` | `useEventDetail.ts` |
| 그 외 (유틸·api·타입·상수) | `camelCase.ts` | `formatPrice.ts`, `eventApi.ts` |

### 규칙
- **무의미한 이름 금지** — `data`, `item`, `tmp`, `obj`, `res1`, `data2`
- **이벤트 핸들러는 `handleXxx`**, prop 은 `onXxx` — `onClick={handleSubmit}`
- **Boolean prop 은 긍정형** — `isDisabled` (O), `isNotEnabled` (X)
- **상수는 모듈 최상단** 또는 `constants.ts` 에 모음

## React 컴포넌트 설계

### 함수형만
- **클래스 컴포넌트 금지** — `ErrorBoundary` 만 예외 ([04-error-handling.md](04-error-handling.md))
- **`React.FC` 미사용** — 일반 함수 + `Props` 타입으로 충분

```tsx
// 좋음 — type Props + 구조분해
type Props = {
  event: EventRead;
  onReserve: (eventId: string) => void;
};

function EventCard({ event, onReserve }: Props) {
  return (
    <article className="rounded-lg border p-4">
      <h3 className="font-semibold">{event.title}</h3>
      <Button onClick={() => onReserve(event.id)}>예매</Button>
    </article>
  );
}

export { EventCard };
```

```tsx
// 나쁨 — React.FC + props 인라인 + any
const EventCard: React.FC<any> = (props) => {
  return <div>{props.event.title}</div>;
};
```

### 규칙
- **props 타입은 `type Props`** — 파일 1개당 컴포넌트 1개면 이름 충돌 없음
- **props 는 구조분해** — `function EventCard({ event, onReserve }: Props)`
- **작은 컴포넌트 — 한 책임** — 한 컴포넌트가 너무 많은 일을 하면 분해 (대략 150줄 초과 시 검토)
- **과한 컨테이너/표현 분리 금지** — "Smart/Dumb" 강제 2파일 분리 안 한다. 데이터는 feature 훅으로 캡슐화 ([03-state-and-data.md](03-state-and-data.md)) 하고 컴포넌트는 그 훅을 쓴다
- **children 패턴 활용** — 레이아웃·래퍼는 `children: ReactNode` 로 합성

```tsx
// 합성 — children 으로 래핑
type Props = { title: string; children: ReactNode };

function Section({ title, children }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
```

## 훅 규칙

### Rules of Hooks 준수
- **최상위에서만 호출** — 조건·반복·중첩 함수 안에서 훅 호출 금지 (`react-hooks/rules-of-hooks: error`)
- **커스텀 훅은 `use` 접두** — 그래야 린터가 훅으로 인식

```tsx
// 나쁨 — 조건 안에서 훅 호출
function Comp({ id }: { id?: string }) {
  if (id) {
    const { data } = useQuery(...); // ❌
  }
}

// 좋음 — 훅은 최상위, enabled 로 제어
function Comp({ id }: { id?: string }) {
  const { data } = useQuery({ queryKey: ['event', id], queryFn: ..., enabled: !!id });
}
```

### 의존성 배열
- **`exhaustive-deps` 경고를 무시하지 않는다** — 누락된 의존성은 버그 신호
- **함수·객체 의존성은 `useCallback`/`useMemo`** 로 안정화하거나, 가능하면 effect 밖으로

### useEffect 최소화
- **서버 데이터 fetch 에 `useEffect` 사용 금지** — TanStack Query 로 ([03-state-and-data.md](03-state-and-data.md))
- **파생 값은 렌더 중 계산** (또는 `useMemo`) — effect 로 state 동기화 금지
- **effect 는 "외부 시스템 동기화" 에만** — 구독·타이머·DOM 수동 조작

```tsx
// 나쁨 — effect 로 서버 데이터 로드
useEffect(() => {
  fetch('/events').then((r) => r.json()).then(setEvents);
}, []);

// 좋음 — Query 훅
const { data: events } = useEvents();
```

## Tailwind 사용 규칙

### 유틸리티 우선
- **유틸리티 클래스로 작성** — 커스텀 CSS 파일 최소화
- **클래스 순서는 `prettier-plugin-tailwindcss` 가 자동 정렬** — 수동 정렬 금지 (상세 [08-design-system.md](08-design-system.md))

### 조건부 클래스 — `cn` 헬퍼

`clsx` + `tailwind-merge` 를 합친 `cn` 헬퍼로 조건부·충돌 클래스를 처리한다.

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// 좋음 — cn 으로 조건부 + 충돌 머지
<button className={cn('rounded px-4 py-2', isActive && 'bg-primary text-white', className)} />

// 나쁨 — 템플릿 문자열 수동 결합 (충돌 미해결, 정렬 안 됨)
<button className={`rounded px-4 py-2 ${isActive ? 'bg-primary text-white' : ''}`} />
```

### 변형 — `cva`

여러 변형(variant)·크기가 있는 컴포넌트는 `class-variance-authority` 로 정의한다.

```ts
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva('inline-flex items-center rounded font-medium', {
  variants: {
    variant: {
      primary: 'bg-primary text-white',
      ghost: 'bg-transparent hover:bg-muted',
    },
    size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

type Props = VariantProps<typeof buttonVariants> & { className?: string };
```

### 규칙
- **매직 임의값(`[...]`) 절제** — `w-[437px]` 같은 건 디자인 토큰으로. 불가피할 때만 ([08-design-system.md](08-design-system.md))
- **`@apply` 남용 금지** — shadcn/ui 베이스·전역 리셋 정도에만. 컴포넌트 스타일은 유틸리티로
- **`style={{...}}` 인라인 스타일 회피** — 동적 계산값(예: 진행률 width)에만 한정

## 안티 패턴 (일반)

### 1. 매직 넘버

```ts
// 나쁨
if (attempt > 3) throw new Error();
setTimeout(poll, 1500);

// 좋음
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 1500;
if (attempt > MAX_RETRIES) throw new Error();
setTimeout(poll, POLL_INTERVAL_MS);
```

### 2. 조기 반환 — 깊은 중첩 회피

```tsx
// 나쁨 — 깊은 중첩
function SeatStatus({ seat }: Props) {
  if (seat) {
    if (seat.isAvailable) {
      if (!seat.isHeld) {
        return <span>예매 가능</span>;
      }
    }
  }
  return <span>불가</span>;
}

// 좋음 — 조기 반환
function SeatStatus({ seat }: Props) {
  if (!seat || !seat.isAvailable || seat.isHeld) {
    return <span>불가</span>;
  }
  return <span>예매 가능</span>;
}
```

### 3. else after return

```ts
// 나쁨
if (err) {
  return showError(err);
} else {
  return showData();
}

// 좋음
if (err) return showError(err);
return showData();
```

### 4. 무의미한 임시 변수

```ts
// 나쁨
function isValid(s: string): boolean {
  const result = s.length > 0;
  return result;
}

// 좋음
function isValid(s: string): boolean {
  return s.length > 0;
}
```

### 5. 광범위한 `catch` 후 삼킴

```ts
// 나쁨 — 에러 삼킴
try {
  await mutateAsync(payload);
} catch (e) {
  // 아무것도 안 함
}

// 좋음 — 특정 처리 또는 상위 위임
try {
  await mutateAsync(payload);
} catch (e) {
  toast.error(toMessage(e)); // 04-error-handling.md 의 매핑 사용
}
```

### 6. `console.log` 디버깅 잔존
- ESLint `no-console` 로 차단 (`warn`/`error` 만 허용)
- 운영 로깅이 필요하면 별도 로거 래퍼로 ([04-error-handling.md](04-error-handling.md))

### 7. `eslint-disable` 남발
- 정당한 이유 없이 `// eslint-disable-next-line` 금지
- 사용 시 사유 명시 — `// eslint-disable-next-line react-hooks/exhaustive-deps -- 1회 마운트 시에만 실행 의도`

## 주석 정책

### 언어
- **한국어 단일** — 코드 주석, 커밋, PR, 이슈 모두 한국어
- **예외**: 변수·함수·컴포넌트 이름, ASCII 식별자, 외부 라이브러리 인용

### 작성 원칙
- **WHY 만 적는다** — WHAT 은 코드가 말한다
- **자명한 주석 금지** — `// count 를 1 증가` 같은 것
- **삭제된 코드 주석으로 남기지 않음** — 버전 관리가 한다
- **JSDoc 과용 금지** — 타입은 TS 가 표현한다. 비자명한 공개 유틸에만 한 줄 요약

```ts
// 좋음 — WHY
// 백엔드가 202 로 비동기 처리 → DB 반영 전까지 단건 폴링 (02-api-integration.md)
const POLL_INTERVAL_MS = 1500;

// 나쁨 — WHAT (자명)
// 폴링 간격
const POLL_INTERVAL_MS = 1500;
```

```ts
// 과한 JSDoc — 금지 (타입이 이미 말함)
/**
 * 좌석 라벨을 만든다.
 * @param row 행
 * @param no 번호
 * @returns 라벨 문자열
 */
function formatSeatLabel(row: string, no: number): string {
  return `${row}-${no}`;
}
```

### TODO 주석

```ts
// TODO(juhy): 결제 폴링 타임아웃 UX 추가 (이슈 #42)
```

- **작성자 + 이유 + 이슈 번호** 명시
- 맥락 없는 `// TODO: fix this` 금지

## 파일 구조 (컴포넌트 파일)

컴포넌트 파일 내부 순서: **imports → 타입 → 상수 → 컴포넌트 → 하위 헬퍼**.

```tsx
// 1. imports (simple-import-sort 그룹 순서)
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import type { EventRead } from '@/features/event/types';

// 2. 타입
type Props = {
  event: EventRead;
  onReserve: (eventId: string) => void;
};

// 3. 상수 (모듈 스코프)
const MAX_TITLE_LENGTH = 40;

// 4. 컴포넌트 (named export 권장)
function EventCard({ event, onReserve }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={cn('rounded-lg border p-4')}>
      <h3>{truncate(event.title)}</h3>
      <Button onClick={() => onReserve(event.id)}>예매</Button>
    </article>
  );
}

// 5. 하위 헬퍼 (이 파일에서만 쓰는 것)
function truncate(s: string): string {
  return s.length > MAX_TITLE_LENGTH ? `${s.slice(0, MAX_TITLE_LENGTH)}…` : s;
}

export { EventCard };
```

- **named export 우선** — 트리쉐이킹·자동 import 유리. 라우트 lazy 진입점만 default 허용 ([09-performance.md](09-performance.md))
- **한 파일 = 컴포넌트 1개** (+ 그 컴포넌트 전용 하위 헬퍼)

## Git 컨벤션

> 본 프로젝트는 **web/.github 의 컨벤션**(이슈·PR 템플릿 + `convention_check.yml`)을 단일 출처로 한다. 본 섹션은 그 컨벤션을 코드 룰셋 안에 다시 한 번 명문화한 것이다.
>
> ⚠️ **백엔드(`cc/app`)와 다르다** — web 의 커밋·PR 카테고리는 **`DOCS` 를 포함해 5개**다 (app 은 4개). 카테고리는 CI(`convention_check.yml`)가 강제한다.

### 커밋 메시지

```
[카테고리]: 변경 내용
```

| 카테고리 | 의미 |
|---|---|
| `[FEAT]` | 기능 추가·변경 |
| `[FIX]` | 버그·오류 수정 |
| `[REFAC]` | 리팩토링·구조 변경 |
| `[DOCS]` | 문서 변경 (README·룰셋·주석 위주) |
| `[CHORE]` | 의존성·설정·빌드 등 코드 외 작업 |

#### 규칙
- **메시지는 한국어 단일** — 명사형 종결 (`구현`, `수정`, `추가`)
- **카테고리는 위 5 가지만** — `convention_check.yml` 이 강제. 임의 추가 시 CI 실패
- **식별자·외부 라이브러리 인용은 ASCII 예외**

#### 예시

```
[FEAT]: 행사 상세 페이지 + 예매 액션 버튼 구현
```

```
[FIX]: 토큰 만료 시 401 인터셉터에서 refresh 누락 보정
```

```
[REFAC]: 예매 폴링 로직을 useReservationPoll 훅으로 분리
```

```
[DOCS]: 06-code-style 룰셋 추가
```

```
[CHORE]: prettier-plugin-tailwindcss 의존성 추가 + 설정 wiring
```

### 브랜치 이름

```
카테고리/#이슈번호/브랜치명
```

| 카테고리 | 대응 커밋 |
|---|---|
| `feature/` | `[FEAT]` |
| `fix/` | `[FIX]` |
| `refactor/` | `[REFAC]` |
| `docs/` | `[DOCS]` |
| `chore/` | `[CHORE]` |

#### 규칙
- **브랜치명은 영문 소문자 + 하이픈** — 변경 핵심 대상을 표현
- **이슈 번호 필수** — 이슈 먼저 워크플로우 ([07-workflow.md](07-workflow.md))

#### 예시

```
feature/#12/event-detail
fix/#21/token-refresh
refactor/#30/reservation-poll-hook
docs/#33/code-style-rules
chore/#34/tailwind-prettier
```

### Pull Request

```
[카테고리#이슈번호] PR 제목
```

- 카테고리는 커밋과 동일 (`FEAT`, `FIX`, `REFAC`, `DOCS`, `CHORE`)
- 제목은 한국어
- **본문 템플릿 — `Summary` / `Changes` / `Review Points`** 섹션 채움 ([07-workflow.md](07-workflow.md) 참조)

#### 예시

```
[FEAT#12] 행사 상세 페이지 + 예매 액션
[FIX#21] 토큰 만료 시 refresh 인터셉터 보정
[DOCS#33] 코드 스타일 룰셋 추가
```

#### 본문 템플릿

```markdown
## Summary
- 무엇을 왜 변경했는지 한두 줄

## Changes
- 변경 요점 1
- 변경 요점 2

## Review Points
- 리뷰어가 집중해서 볼 지점 (설계 선택·트레이드오프 등)
```

## 코드 리뷰 체크리스트

PR 제출 전 확인:

- [ ] `tsc --noEmit` · `eslint .` · `prettier --check .` 모두 통과
- [ ] `any` 없음 (불가피하면 `unknown` + 가드)
- [ ] 함수 시그니처·props 에 타입 명시 (`type Props`)
- [ ] 매직 넘버·매직 문자열 상수화
- [ ] 깊은 중첩 없음 — 조기 반환 적용
- [ ] 서버 데이터 fetch 에 `useEffect` 안 씀 (Query 훅 사용)
- [ ] 훅 의존성 배열 정확 (`exhaustive-deps` 경고 없음)
- [ ] 조건부 클래스는 `cn`, 변형은 `cva` 사용
- [ ] `console.log` 디버깅 잔존 없음
- [ ] 주석이 WHY 만 설명 (자명한 주석·과한 JSDoc 없음)
- [ ] 사용 안 하는 import·변수 없음
- [ ] 응답·폼 데이터는 타입/Zod 로 검증 ([03-state-and-data.md](03-state-and-data.md))
- [ ] 테스트 추가됨 ([05-testing.md](05-testing.md))
- [ ] 커밋·브랜치·PR 컨벤션 준수 (카테고리 5개 — `DOCS` 포함)

## 안티 패턴 목록

### 금지
- **`any` 사용** — `unknown` + 가드로
- **`useEffect` 로 서버 데이터 fetch** — TanStack Query 로 ([03-state-and-data.md](03-state-and-data.md))
- **컴포넌트에서 직접 `axios`/`fetch` 호출** — api 모듈 + Query 훅 경유 ([02-api-integration.md](02-api-integration.md))
- **`className` 템플릿 문자열 수동 결합** — `cn` 헬퍼로 (충돌·정렬 미해결)
- **임의값(`w-[437px]`) 남발** — 디자인 토큰으로 ([08-design-system.md](08-design-system.md))
- **`React.FC` / props 인라인 타입** — `type Props` 명시
- **클래스 컴포넌트** — `ErrorBoundary` 외 금지
- **조건·반복문 안에서 훅 호출** — Rules of Hooks 위반
- **`console.log` 디버깅 잔존** — ESLint 차단
- **이유 없는 `eslint-disable` / `as` 단언** — 컴파일러·린터를 속이는 신호
- **커밋·PR 카테고리 임의 추가** — 5개(`FEAT`/`FIX`/`REFAC`/`DOCS`/`CHORE`)만, CI 강제
