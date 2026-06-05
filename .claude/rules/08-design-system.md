# 디자인 시스템 · UI 컴포넌트

## 핵심 원칙

> **단일 디자인 시스템** — shadcn/ui + Tailwind 토큰을 단일 출처로 한다. 일관성 > 화려함. 모든 화면은 사용자가 **핵심 액션(예매·결제)에 빠르게 도달**하도록 설계한다. 임의 hex 색·1회용 컴포넌트·과한 애니메이션은 일관성을 깨뜨린다.

본 프로젝트의 정체성은 **API 범위 내에서 디자인과 효율적 기능 배치에 집중** ([README.md](README.md)) 이다. 따라서 디자인 시스템 룰은 다른 룰보다 우선순위가 높다 — 코드 스타일이 좋아도 화면이 무너지거나 처리 상태가 안 보이면 본 프로젝트는 실패다.

## 디자인 토큰

### 단일 출처 — Tailwind theme + CSS 변수

색·간격·타이포·radius 는 **Tailwind theme 와 shadcn 방식 CSS 변수**로만 정의한다. 컴포넌트에 hex·rgb 직접 입력 금지.

```css
/* src/index.css — shadcn/ui 기본 토큰 (HSL 채널 값) */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --primary: 222 89% 55%;          /* 핵심 액션(예매·결제 버튼) */
    --primary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;            /* 보조 영역·비활성 배경 */
    --muted-foreground: 215 16% 47%;
    --destructive: 0 72% 51%;        /* 취소·삭제 */
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --ring: 222 89% 55%;             /* 포커스 링 */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --destructive: 0 63% 31%;
    --border: 217 33% 24%;
    --ring: 224 76% 60%;
  }
}
```

```ts
// tailwind.config.ts — CSS 변수를 Tailwind 색으로 노출
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
} satisfies Config;
```

### 토큰 규칙

| 토큰 종류 | 출처 | 사용 |
|---|---|---|
| 색 | CSS 변수 (`--primary` 등) | `bg-primary`, `text-muted-foreground` — hex 직접 입력 금지 |
| 간격 | Tailwind 기본 스케일 (4px 단위) | `p-4`, `gap-6`, `space-y-2` — 임의 `p-[13px]` 금지 |
| 타이포 | Tailwind `text-*` | `text-sm`/`text-base`/`text-lg`/`text-2xl` — px 고정 금지 |
| radius | `--radius` 파생 | `rounded-md`, `rounded-lg` |

- **하드코딩 색 금지** — `text-[#1a73e8]`, `style={{ color: "#333" }}` 금지. 새 색이 필요하면 토큰을 추가
- **의미 기반 색 사용** — 파란색이라서 `primary` 가 아니라, "핵심 액션"이라서 `primary`. 토큰의 의미를 따른다
- **다크모드는 `class` 전략** — `darkMode: "class"`, `.dark` 클래스 토글. 색은 변수로 자동 전환되므로 컴포넌트는 `dark:` variant 를 거의 쓸 필요 없음

## shadcn/ui 사용 규칙

shadcn/ui 는 **Radix 프리미티브 기반**의 복사형 컴포넌트다 (npm 의존성이 아니라 소스가 프로젝트에 들어옴).

### 추가

```bash
# 컴포넌트 추가 — src/components/ui/ 에 소스 생성
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add form input label dialog
```

### 규칙
- **`components/ui/` 는 shadcn 전용** — 직접 만든 도메인 컴포넌트를 이 디렉토리에 넣지 않는다
- **직접 수정은 신중** — `components/ui/*` 를 fork 해 고치면 향후 `add` 재실행·업그레이드가 어려워진다. 토큰·variant 로 해결되면 원본을 건드리지 않는다
- **조합은 상위에서** — `ui` 원자를 묶는 일은 `features/<domain>/components` 또는 `pages` 에서. `ui` 컴포넌트끼리 서로 import 해 새 합성물을 만들지 않는다
- **variant 는 cva 로** — 색·크기 변형은 `class-variance-authority` 변형으로 추가 (아래 "스타일링 유틸" 참조)

### 스타일링 유틸 — `cn` + `cva`

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- **className 합성은 항상 `cn(...)`** — 조건부 클래스·충돌 해소(`tailwind-merge`)를 한 곳에서. 문자열 직접 `+` 연결 금지
- **변형은 `cva`** — `variant`/`size` 같은 축을 가진 컴포넌트는 cva 로 정의 (shadcn `button` 패턴)

```ts
// 예: 상태 배지 variant
const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      pending: "bg-muted text-muted-foreground",
      success: "bg-primary/10 text-primary",
      failed: "bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { tone: "pending" },
});
```

## 컴포넌트 계층

```
components/ui/            ← 원자 (shadcn). Button, Input, Dialog, Badge, Skeleton ...
components/layout/        ← AppLayout, Header, Nav, Footer
features/<domain>/components/  ← 도메인 UI. EventCard, ReservationStatusBadge, PaymentForm ...
pages/                   ← 조합. 라우트 단위 화면. 레이아웃 + feature 컴포넌트 배치
```

| 계층 | 책임 | 금지 |
|---|---|---|
| `ui` | 토큰 기반 무상태 프리미티브 | 도메인 지식, API 호출, 라우팅 |
| `layout` | 화면 골격 (헤더·네비·콘텐츠 슬롯) | 도메인 데이터 fetch |
| `features/<domain>/components` | 한 도메인의 표현 컴포넌트 | 다른 도메인 컴포넌트 직접 import |
| `pages` | 라우트 화면 조합 + feature hook 호출 | 인라인 스타일 덩어리, 직접 fetch ([03](03-state-and-data.md)) |

### 재사용 / 중복 정책
- **3번 반복되면 추출** — 비슷한 마크업 2개는 허용. 3번째에 공통 컴포넌트로 추출 ([README.md](README.md) 간략화 원칙 일관)
- **추출 위치는 사용처 기준** — 한 도메인 안에서만 쓰면 `features/<domain>/components`, 도메인 무관(예: `EmptyState`, `StatusBadge`)이면 `components/` 상위 또는 `ui`
- **추상화 우선 설계 금지** — "나중에 쓸지 모르니" props 를 미리 늘리지 않는다

## 타이포그래피 · 간격 · 일관성

### 타이포 위계

| 용도 | 클래스 |
|---|---|
| 페이지 제목 | `text-2xl font-bold tracking-tight` |
| 섹션 제목 | `text-lg font-semibold` |
| 본문 | `text-base text-foreground` |
| 보조·메타 | `text-sm text-muted-foreground` |
| 캡션·배지 | `text-xs` |

### 간격 스케일
- **Tailwind 4px 스케일만** — `gap-2`(8px) / `gap-4`(16px) / `gap-6`(24px) / `gap-8`(32px). 임의 `mt-[7px]` 금지
- **수직 리듬은 `space-y-*`** — 폼·리스트는 `space-y-4` 같은 일관 간격
- **컨테이너 패딩 일관** — 카드 `p-4`~`p-6`, 페이지 `px-4 md:px-6` 표준
- **제목과 본문 간격 고정** — 섹션 제목 아래 `mb-2`, 섹션 사이 `mb-6` 식으로 통일

## 반응형

### 모바일 우선
- **기본 스타일 = 모바일** — `sm:`/`md:`/`lg:` 로 위로 확장. `max-*` 역방향 우선 금지
- **breakpoint**: `sm` 640 / `md` 768 / `lg` 1024

| 화면 | 모바일 | md 이상 |
|---|---|---|
| 행사 목록 | 1열 스택 | `grid-cols-2 lg:grid-cols-3` |
| 행사 상세 | 이미지 → 정보 → 액션 세로 | 2열 (이미지 \| 정보+액션) |
| 폼(로그인·등록) | 풀폭 단일 컬럼 | `max-w-md`/`max-w-2xl` 중앙 정렬 |
| 예매·결제 내역 | 카드 리스트 | 테이블 또는 카드 그리드 |

```tsx
// 행사 목록 그리드 — 작은 화면에서 무너지지 않게
<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {events.map((e) => (
    <li key={e.event_id}>
      <EventCard event={e} />
    </li>
  ))}
</ul>
```

### 네비게이션 모바일 패턴
- **md 이상**: 헤더 가로 네비
- **모바일**: 햄버거 → shadcn `Sheet`(Drawer) 로 슬라이드, 또는 핵심 액션은 하단 고정 바
- **고정 폭 금지** — `w-[1200px]` 같은 픽셀 고정 레이아웃 금지. `max-w-screen-lg mx-auto` 로 제한

## 레이아웃 · 네비게이션 패턴

### AppLayout

```tsx
// src/components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-screen-lg px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
```

### 인증 상태별 네비
- **비로그인**: 로그인 / 회원가입
- **로그인**: 행사 목록 · 내 예매 · 내 결제 내역 · 내 정보 · 로그아웃
- **보호 라우트 진입 UX** — 미인증 사용자가 보호 화면 접근 시 토스트("로그인이 필요합니다") + 로그인으로 리다이렉트. 라우트 가드 구현은 [01-architecture.md](01-architecture.md) 의 라우팅·`RequireAuth` 참조

## 상태 가시화 (핵심)

> 본 프로젝트에서 **가장 중요한 디자인 책임**. 모든 비동기 데이터·액션은 로딩 / 빈 / 에러 / **처리 중** 4 상태를 명시적으로 보여준다. "아무것도 안 보이는 빈 화면" 은 버그로 취급한다.

### 로딩 — Skeleton / Spinner
- **레이아웃이 잡힌 영역** (목록·카드) → `Skeleton` (레이아웃 시프트 방지)
- **단발 액션** (버튼 제출) → 버튼 내부 `Spinner`(lucide `Loader2` 회전)

```tsx
// 목록 로딩 스켈레톤
function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border p-4">
          <Skeleton className="aspect-video w-full rounded-md" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
```

### 빈 상태 — EmptyState
목록이 비면(내 예매 0건 등) 안내 + 다음 액션을 제시한다.

```tsx
// src/components/EmptyState.tsx
import { type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      <p className="text-base font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
```

### 에러
에러 표시·매핑(401/404/409/422/503)·`ErrorBoundary` 정책은 [04-error-handling.md](04-error-handling.md) 단일 출처. 본 문서는 **표현**만 — 에러는 토큰 `destructive` 색, 인라인 영역(폼 필드) 또는 페이지 단위(목록 실패) 로 노출하고 "다시 시도" 버튼을 함께 둔다.

### 비동기 처리 중 (예매·결제 202)

예매·결제 생성/취소는 백엔드가 `202 Accepted` + 식별자를 즉시 반환하고 실제 반영은 SQS→Lambda 비동기다 ([02-api-integration.md](02-api-integration.md)). 따라서 **"요청 접수 → 처리 중 → 완료/실패"** 를 반드시 시각화한다. 사용자가 "내 예매가 됐나?" 를 의심하게 두지 않는다.

```tsx
// src/features/reservation/components/ReservationStatusBadge.tsx
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Status = "accepted" | "processing" | "confirmed" | "failed";

export function ReservationStatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "accepted":
    case "processing":
      return (
        <Badge className="gap-1 bg-muted text-muted-foreground" aria-live="polite">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          처리 중
        </Badge>
      );
    case "confirmed":
      return (
        <Badge className="gap-1 bg-primary/10 text-primary">
          <CheckCircle2 className="size-3" aria-hidden />
          예매 완료
        </Badge>
      );
    case "failed":
      return (
        <Badge className="gap-1 bg-destructive/10 text-destructive">
          <XCircle className="size-3" aria-hidden />
          실패
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1 bg-muted text-muted-foreground">
          <Clock className="size-3" aria-hidden />
          대기
        </Badge>
      );
  }
}
```

### 처리 중 UX 규칙
- **즉시 피드백** — 202 수신 즉시 "처리 중" 배지/토스트. 폴링([02](02-api-integration.md))으로 상태 갱신
- **낙관적이되 단정 금지** — "완료" 가 아니라 "처리 중" 으로 표시. 폴링이 `confirmed` 를 확인한 뒤 "완료" 전환
- **진행 표현** — 결제처럼 수 초 걸리는 흐름은 `Spinner` + "결제 처리 중입니다" 문구, 또는 비결정 `Progress` 바
- **중복 제출 차단** — 처리 중에는 해당 액션 버튼 `disabled`

## 폼 디자인

shadcn `Form`(React Hook Form + Zod 연동) 을 표준으로 한다. 검증·스키마는 [03-state-and-data.md](03-state-and-data.md) 단일 출처, 본 문서는 배치·피드백을 다룬다.

```tsx
// 로그인 폼 — label/설명/에러 배치 + 제출 로딩
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>이메일</FormLabel>
          <FormControl>
            <Input type="email" autoComplete="email" {...field} />
          </FormControl>
          <FormDescription>가입 시 사용한 이메일을 입력하세요.</FormDescription>
          <FormMessage /> {/* Zod 에러를 destructive 색으로 표시 */}
        </FormItem>
      )}
    />

    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
      {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
      로그인
    </Button>
  </form>
</Form>
```

### 규칙
- **모든 입력에 `FormLabel`** — placeholder 를 label 대용으로 쓰지 않는다 (접근성)
- **에러는 `FormMessage`** — 필드 바로 아래, `destructive` 색. 필드에 `aria-invalid` 자동 연결
- **제출 버튼은 로딩·비활성** — `isSubmitting` 동안 Spinner + `disabled` (중복 제출 차단)
- **설명은 `FormDescription`** — 제약(비밀번호 규칙 등)을 미리 안내해 검증 실패를 줄임
- **행사 등록 같은 긴 폼** — 논리 그룹을 `space-y-6` 섹션으로 나누고 각 섹션에 소제목

## 피드백 — Toast · Dialog

### Toast (Sonner)
- **성공·실패 단발 알림** — "예매 요청을 접수했습니다", "결제에 실패했습니다"
- **위치·중복 정책** — 우상단/우하단 단일 위치 고정. 같은 메시지 연타는 1개로 합침
- **에러 토스트는 행동 가능하게** — 가능하면 "다시 시도" 액션 포함
- **남용 금지** — 화면 안에서 이미 보이는 상태(목록 갱신 등)는 토스트로 또 알리지 않음

```tsx
import { toast } from "sonner";

toast.success("예매 요청을 접수했습니다. 처리 결과를 확인하세요.");
toast.error("결제에 실패했습니다.", { action: { label: "다시 시도", onClick: retry } });
```

### Dialog — 확인 (취소/삭제)
파괴적 액션(예매 취소, 행사 삭제)은 **반드시 확인 Dialog** 를 거친다.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">예매 취소</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>예매를 취소할까요?</AlertDialogTitle>
      <AlertDialogDescription>
        취소 후에는 되돌릴 수 없습니다. 같은 좌석은 다른 사용자가 예매할 수 있습니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>닫기</AlertDialogCancel>
      <AlertDialogAction onClick={onCancelReservation}>예매 취소</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- **파괴적 확정 버튼은 `destructive` 색**, 기본 포커스는 안전한 "닫기" 에
- **확정 후에도 처리 중 가시화** — 취소도 비동기(202)이므로 확정 직후 "처리 중" 표시

## 접근성

Radix 기반 shadcn 컴포넌트는 키보드·포커스·aria 를 기본 제공한다. 이를 **깨뜨리지 않는 것**이 핵심.

- **키보드 동작 유지** — Dialog/Sheet/Dropdown 의 포커스 트랩·Esc 닫기를 커스텀으로 무력화하지 않는다
- **포커스 링 제거 금지** — `focus-visible:ring-ring` 유지. `outline-none` 만 주고 대체 표시 없이 두지 않는다
- **색 대비 WCAG AA** — 텍스트 4.5:1, 큰 텍스트 3:1. `muted-foreground` 를 본문 핵심 정보에 쓰지 않는다 (보조용)
- **label 연결** — 모든 입력은 `label`(또는 `FormLabel`)과 연결. 아이콘 전용 버튼은 `aria-label`
- **이미지 alt** — 행사 `img_urls` 이미지는 의미 있는 `alt`(행사명). 장식 아이콘은 `aria-hidden`
- **div 클릭 금지** — 클릭 가능한 것은 `button`/`a`. `onClick` 단 `div` 는 키보드·스크린리더 접근 불가
- **`aria-live`** — "처리 중 → 완료/실패" 상태 전환 영역에 `aria-live="polite"` 로 변경 안내
- **prefers-reduced-motion** — 모션 축소 설정 존중

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 이미지 / 미디어

행사 `img_urls`(리스트) 처리. 성능 상세는 [09-performance.md](09-performance.md).

- **비율 유지** — 컨테이너에 `aspect-video`/`aspect-square` + `object-cover`. 레이아웃 시프트 방지
- **lazy 로딩** — 목록 썸네일은 `loading="lazy"` (첫 화면 above-the-fold 는 eager)
- **폴백** — `onError` 로 토큰 색 플레이스홀더 교체. `img_urls` 가 비면 폴백 블록 렌더

```tsx
function EventImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted">
        <ImageOff className="size-8 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-video w-full rounded-md object-cover"
    />
  );
}
```

## 디자인 원칙 (요약 — README 일관)

1. **명료함** — 핵심 액션(예매·결제)이 한눈에. 위계·여백으로 시선 유도
2. **상태 가시화** — 로딩·빈·에러·처리 중을 항상 노출. 빈 화면 금지
3. **일관성** — 토큰·shadcn 단일 시스템. 같은 의미는 같은 색·간격·컴포넌트
4. **반응형** — 모바일 우선. 목록·상세·폼이 작은 화면에서 무너지지 않음
5. **접근성** — Radix 기본 보장 유지, 색 대비 AA, 키보드·스크린리더 가능

## 안티 패턴

### 금지
- **임의 hex 색 산재** — `text-[#1a73e8]`, `style={{ background: "#fafafa" }}`. 토큰만 사용
- **inline style 남용** — `style={{...}}` 로 레이아웃·색 지정. Tailwind 토큰 클래스로
- **shadcn 컴포넌트 fork 후 방치** — `components/ui/*` 를 무분별 수정해 업그레이드 불가 상태로 만듦
- **픽셀 고정 폭** — `w-[1200px]`, `min-w-[980px]` 로 반응형 파괴. `max-w-*` + `mx-auto`
- **접근성 무시 `div` 클릭** — `onClick` 단 `div`/`span`. 키보드·스크린리더 접근 불가
- **과한 애니메이션** — 모든 요소에 transition·bounce. `prefers-reduced-motion` 무시
- **상태 미표시** — 로딩/빈/에러/처리 중 없이 데이터만 렌더 (본 프로젝트 최대 금기)
- **`ui` 디렉토리에 도메인 컴포넌트 투입** — `EventCard` 를 `components/ui/` 에 넣음
- **포커스 링 제거** — `outline-none` 만 주고 `focus-visible` 대체 없음
- **placeholder 를 label 대용** — 입력 비면 라벨이 사라져 맥락 상실
