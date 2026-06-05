# AI 작업 진행 규약

이 문서는 Claude · Copilot 등 AI 협업 도구가 본 프로젝트 (티켓팅 웹 프론트엔드 `cc/web`) 에서 작업을 진행할 때 따라야 하는 **워크플로우 규약**입니다. 사용자 승인 요청을 빈번히 발생시켜 흐름이 끊기는 문제를 막고, AI 의 자율성과 안전성 사이 균형을 명문화합니다.

본 규약은 **무엇을 만드느냐**(아키텍처·API 연동·디자인 시스템) 가 아니라 **어떻게 진행하느냐**를 다룹니다. 코드 자체 규약은 [01-architecture.md](01-architecture.md) ~ [06-code-style.md](06-code-style.md), [08-design-system.md](08-design-system.md), [09-performance.md](09-performance.md) 참조.

협업 컨벤션의 **단일 출처는 `web/.github`** (이슈·PR 템플릿 + `convention_check.yml`) 이며, 백엔드(`cc/app`)와 표기가 다릅니다 (가장 큰 차이: web 커밋 카테고리에 **`DOCS`** 포함). 본 문서는 그 컨벤션을 워크플로우 관점에서 명문화합니다.

> **간략화 우선** — 본 규약 자체도 본 프로젝트 규모에 맞춰 최소한입니다. "혹시 모르니" 의 예외 조항을 추가하지 않습니다.

## 핵심 6 규약

### 1. 이슈 먼저 (issue-first) 생성 정책

사용자 작업 지시가 도착하면 **코드 수정 시작 전에 GitHub 이슈를 먼저 생성**한다.

#### 원칙

- 모든 작업은 GitHub 이슈로 추적 — branch · commit · PR 모두 그 이슈를 참조
- **이슈 생성 시 카테고리 prefix 부여** — `web/.github/ISSUE_TEMPLATE` 의 4 분류 (`[FEATURE]`, `[BUG]`, `[CHORE]`, `[REFACTOR]`) 준수
- **규모가 PR 1 개로 reviewable diff 안 되면 메인 이슈 + sub-issue N 개로 분할**
  - 메인 이슈 본문에 전체 그림 + sub-issue 목록 + 완료 조건 명시
  - **GitHub 의 Sub-issue 기능 활용** — `gh api graphql` 의 `addSubIssue` mutation 으로 계층 명시
- 각 sub-issue 단위로 `branch → 작업 → commit → PR` 사이클 반복
- PR closing reference 는 그 sub-issue (`Closes #<sub>`). 메인 이슈는 모든 sub-issue close 시 함께 close

#### Why
- 작업 진입 전 사용자와 scope 합의 강제 → 작업 도중 방향 이탈 회피
- ad-hoc 으로 PR 직전 이슈를 만드는 패턴 차단
- 메인 ↔ sub-issue 의 계층 관계 GitHub 상 명확화

#### 예외
- 사용자가 명시적으로 **"이슈 없이 진행해"** / **"단발 hotfix"** 라고 지시한 경우
- 1 줄 typo · 명백한 작은 chore — 단, PR 타이틀 컨벤션(`[CHORE#N]`) 충족 위해 작업 시작 전 이슈 생성 권장

#### 판단 모호 시
규모가 작아 보여도 **이슈 1 개 생성**. 작업 끝난 후 PR 정리할 때 추가 비용 거의 없음.
"이거 큰가?" 가 50/50 이면 **메인 + sub-issue 분할 쪽**으로 보수 분류.

#### Sub-issue 등록 명령

```bash
# 메인 이슈에 sub-issue 등록 (Relation 자동 활성화)
MAIN_ID=$(gh issue view <MAIN_NUMBER> --json id --jq .id)
SUB_ID=$(gh issue view <SUB_NUMBER> --json id --jq .id)

gh api graphql -f query='
mutation($issueId: ID!, $subIssueId: ID!) {
  addSubIssue(input: {issueId: $issueId, subIssueId: $subIssueId}) {
    issue { number }
    subIssue { number }
  }
}' -f issueId="$MAIN_ID" -f subIssueId="$SUB_ID"
```

<br>

### 2. 자율 진행 정책 — 승인 요청 최소화

쿼리의 의도가 명확하면 AI 는 **사용자 승인 없이 진행**한다.

> **핵심 원칙 1**: 아래 "자율 진행 영역" 에 해당하는 작업은 **절대 사용자 확인을 요청하지 않는다.**
> 컴포넌트·페이지 작성, 파일 수정, 커밋, 브랜치 생성, lint·test·build 실행 등은 묻지 않고 즉시 실행한다.
> 이미 허용된 도구 (`Bash`, `Edit`, `Write`, `gh`, `git`, `pnpm`, `vitest`, `eslint`, `prettier`, `tsc`, `vite` 등) 는 추가 승인 없이 사용한다.
>
> **핵심 원칙 2**: 최대한 자율적으로 진행하되, "예외 영역" 에 해당하는 작업은 반드시 사용자 확인을 받는다.

#### 예외 영역 (반드시 사용자 확인)

| 영역 | 예시 |
|---|---|
| **시스템 자체 변경** | OS · 패키지 · 글로벌 환경 변경 (`pnpm add -g`, `npm i -g`, `brew install`, `sudo ...`, 시스템 서비스 enable 등) |
| **언급 없는 destructive 권한** | `git push --force`, 브랜치 삭제, `git reset --hard`, 무인 PR merge, `gh pr merge` |
| **외부 시스템 영향** | PR merge · issue close · 배포 트리거 (Vercel/Netlify 등 prod deploy) · 외부 서비스 연동 (Sentry/Analytics 키 추가, 외부 API 신규 호출) |
| **모호한 작업 범위** | 사용자 의도가 다중 해석 가능 · scope 불명확 — 진행 전 구체화 질문 |

#### 자율 진행 영역 (승인 불필요 — 즉시 실행)

- 컴포넌트 · 페이지 · 훅 작성 · 수정 · 리팩토링 · 삭제
- 테스트 추가 · 갱신 (Vitest + RTL + MSW)
- 새 파일 · 디렉토리 생성
- 의존성 추가 (`pnpm add`, `package.json` 수정) — 단 신규 외부 패키지는 규약 5 적용
- Branch 생성, 정상 push (force-push 아닌)
- Commit 단위 결정 및 실행
- PR 본문 작성
- 이슈 · PR Label 부여
- **shadcn/ui 컴포넌트 추가** (`pnpm dlx shadcn@latest add <component>`) — 프로젝트 표준 도구
- lint · format · type check · test · build 실행 (`eslint`, `prettier`, `tsc --noEmit`, `vitest`, `vite build`)

#### 판단 모호 시
"이게 destructive 영역인가?" 가 50/50 이면 **사용자 확인 쪽으로 보수 분류**. 단, 이미 자율 진행 영역으로 열거된 항목은 50/50 이 아니다 — 확인 없이 진행한다.

<br>

### 3. Commit-per-TODO 정책

별다른 사용자 언급이 없으면, AI 는 작업을 **논리적 변경 단위 (TODO)** 마다 commit 한다.

> **금지**: 작업을 모두 완료한 뒤 한 번에 몰아서 커밋하는 것은 **절대 허용하지 않는다.**
> 논리적 변경 단위가 완성되는 즉시 커밋한다. 커밋을 뒤로 미루지 않는다.

#### 원칙

- 논리적 변경 단위 완성 → **즉시 커밋** (다음 단위 작업 시작 전)
- 큰 PR 도 reviewable diff 단위로 분할 commit
- 각 commit 메시지는 [06-code-style.md](06-code-style.md) 의 컨벤션 준수:
  - **prefix 는 다섯 가지 중 택 1**: `[FEAT]:` / `[FIX]:` / `[REFAC]:` / `[DOCS]:` / `[CHORE]:`
  - 이후 한국어 + 변경 의도
  - `convention_check.yml` (commit-lint) 이 모든 커밋 메시지를 `^\[(FEAT|FIX|REFAC|DOCS|CHORE)\]: .+` 패턴으로 강제 — 위반 시 CI 실패
- 빌드 그린 유지 — 각 commit 이 lint · type check · test 통과 가능한 상태

#### 잘못된 패턴 (금지)

```text
# BAD — 작업 완료 후 모아서 한 번에 커밋
[api 모듈] → [Query 훅] → [페이지] → [컴포넌트] → [테스트] → 커밋 하나로 묶음
```

#### 올바른 패턴

```text
# GOOD — 논리 단위마다 즉시 커밋
[/events/:id 라우트 + 페이지 골격 추가] → 커밋
[event api 모듈 (getEvent) 추가] → 커밋
[useEvent Query 훅 추가] → 커밋
[EventDetail 컴포넌트 + 예매 액션 버튼] → 커밋
[EventDetail RTL + MSW 테스트] → 커밋
```

#### 예외
- 사용자가 명시적으로 **"한 번에 묶어줘"** / **"squash 해줘"** 요청 시 단일 commit
- 사용자가 **"단일 fix 만 해줘"** 등 명백한 단일 변경을 지시한 경우

#### 예시

```
[FEAT]: 행사 상세 라우트 + 페이지 골격 추가
[FEAT]: event api 모듈 getEvent 추가
[FEAT]: useEvent Query 훅 추가
[FEAT]: EventDetail 컴포넌트 + 예매 액션 버튼 구현
[FEAT]: EventDetail 컴포넌트 테스트 추가
```

<br>

### 4. PR 자동 생성 정책

작업 완료 직후 (별다른 언급 없으면) AI 는 **PR 을 자동 생성**한다.

#### 컨벤션 준수

- **PR 타이틀**: `[카테고리#이슈번호] 제목` 형식 — `[FEAT#N]` / `[FIX#N]` / `[REFAC#N]` / `[DOCS#N]` / `[CHORE#N]` ([06-code-style.md](06-code-style.md) 참조)
  - `convention_check.yml` (pr-title-lint) 이 `^\[(FEAT|FIX|REFAC|DOCS|CHORE)#[0-9]+\]` 패턴으로 강제 — 위반 시 CI 실패
- **본문**: `web/.github/PULL_REQUEST_TEMPLATE.md` 의 모든 섹션 (`Summary` / `Changes` / `Review Points`) 채움
- **이슈 링크**: PR 본문 또는 Development sidebar 에 `Closes #N`
- **Label 부여**: 규약 6 의 매핑에 따라 PR 에도 동일 label 부여

#### PR 템플릿 (web/.github 단일 출처)

```markdown
## Summary

- 배경:
- 목적:

## Changes

- 변경 요점 1
- 변경 요점 2

## Review Points

- 중점적으로 봐야 할 부분:
```

> `Closes #<번호>` 는 본문 (예: `Summary` 하단) 또는 PR Development sidebar 에 명시. PR 제목·커밋 prefix 와 별개로 이슈 연결은 누락하지 않는다.

#### gh pr create 예시

```bash
gh pr create \
  --title "[FEAT#12] 행사 상세 + 예매 액션" \
  --label feature \
  --body "$(cat <<'EOF'
## Summary

- 배경: 행사 목록에서 단건으로 진입할 상세 화면 필요
- 목적: 행사 정보 노출 + 예매(202 비동기) 액션 제공

## Changes

- /events/:id 라우트 + EventDetail 페이지
- event api 모듈 getEvent + useEvent Query 훅
- 예매 요청 버튼 (202 처리 상태 가시화)

## Review Points

- 중점적으로 봐야 할 부분: 202 폴링 중 로딩/실패 UX

Closes #12
EOF
)"
```

#### 예외

- 작업이 이슈와 무관한 단발성 chore — 사용자가 "이슈 없이 PR 올려줘" 또는 "이슈 먼저 만들어줘" 명시
- 작업이 PR 단위가 아닌 단순 점검 (예: 빌드 확인, 의존성 audit) 만 요청한 경우

<br>

### 5. 권한 · 의존성 최소화

자율 진행 시, **꼭 필요한 경우가 아니면 이미 허용된 권한 범위 내에서만 동작**한다.

#### 원칙

- 새 `Bash(...)` permission 요청은 작업 완수에 불가피할 때만
- 동등 효과를 낼 수 있는 기존 허용 도구가 있으면 그것을 우선 — 기존 `gh` · `git` · `pnpm` · `vitest` · `eslint` · `prettier` · `tsc` · `vite` 활용
- **신규 외부 의존성 추가**(`pnpm add`) 는 **본 규약의 "모호 영역"** 으로 간주 → 사용자 사전 확인
  - 단, 이미 룰셋 스택에 명시된 의존성 추가는 **자율 진행**: `react-router(-dom)`, `@tanstack/react-query`, `axios`, `react-hook-form`, `zod`, `tailwindcss` 및 Tailwind 플러그인, `shadcn` 관련 (Radix `@radix-ui/*`, `lucide-react`), `clsx`, `tailwind-merge`, `class-variance-authority(cva)`, `vitest`, `@testing-library/*`, `msw`, `@vitejs/plugin-react`
- `WebFetch` · `WebSearch` 도 새 도메인은 작업 명시적 필요 시에만

#### 이유
- 누적 권한이 늘어날수록 `.claude/settings.local.json` 의 entries 비대화
- 잘못된 도구·패키지 도입은 보안·번들 위험 (토큰 노출, 번들 비대화, 공급망 공격 등)

#### 패키지 선택 보수 원칙
- **이미 스택에 있는 라이브러리로 가능하면 그것 사용** (예: 날짜는 별도 라이브러리 전에 `Intl` 검토, 전역 상태는 Redux 전에 Query + 최소 context)
- 새 패키지가 정말 필요한 경우, 다음을 함께 보고:
  - 왜 기존 패키지로 안 되는지
  - **번들 크기** (gzip, tree-shaking 가능 여부)
  - 유지보수 활성도 (최근 release · stars)
  - 라이선스

<br>

### 6. 이슈 · PR 분류 메타데이터 정책 — Label

이슈 · PR 생성 시 **항상 Label 부여**.

#### 카테고리 prefix 체계 (commit / PR / 이슈)

본 repo 는 commit · PR · 이슈 제목의 prefix 를 의도적으로 다른 표기로 운용한다. (백엔드와 달리 **`DOCS` 포함, 이슈는 full-word 대문자**)

| 위치 | 형식 | 예시 |
|---|---|---|
| Commit message | `[FEAT]:` / `[FIX]:` / `[REFAC]:` / `[DOCS]:` / `[CHORE]:` (대문자 축약 + 콜론) | `[FIX]: 토큰 만료 시 재로그인 리다이렉트 보정` |
| PR title | `[FEAT#N]` / `[FIX#N]` / `[REFAC#N]` / `[DOCS#N]` / `[CHORE#N]` (commit 카테고리 + #이슈번호, 콜론 없음) | `[FEAT#12] 행사 상세 + 예매 액션` |
| Issue title | `[FEATURE]` / `[BUG]` / `[CHORE]` / `[REFACTOR]` (full-word 대문자, 콜론 없음, ISSUE_TEMPLATE 기준) | `[FEATURE] 행사 상세 + 예매 액션` |

> commit/PR 의 `[FEAT]` ↔ 이슈의 `[FEATURE]`, commit/PR 의 `[FIX]` ↔ 이슈의 `[BUG]` 처럼 **위치별 표기가 다르다.** PR 제목은 commit 표기(`FEAT/FIX/REFAC/DOCS/CHORE`)를 따르고, 이슈 제목은 템플릿 표기(`FEATURE/BUG/CHORE/REFACTOR`)를 따른다.

#### Label 매핑 (이슈 prefix 기준)

| Issue prefix | Label |
|---|---|
| `[FEATURE]` | `feature` |
| `[BUG]` | `bug` |
| `[REFACTOR]` | `refactor` |
| `[CHORE]` | `chore` |

> 라벨은 이슈 템플릿(`feature.md` 등)에 이미 `labels:` 로 기본 지정돼 있다. 템플릿 없이 직접 생성하면 `--label` 로 동일하게 부여한다.
> PR 의 Label 은 그 PR 이 닫는 이슈 (`Closes #N`) 의 Label 과 동일하게 부여한다.

#### 부여 명령 예시

**이슈 생성 + Label 부여**

```bash
gh issue create \
  --title "[FEATURE] 행사 상세 + 예매 액션" \
  --label feature \
  --body "..."
```

**PR 생성 + Label 부여**

```bash
gh pr create \
  --title "[FEAT#12] 행사 상세 + 예매 액션" \
  --label feature \
  --body "..."   # 규약 4 의 PR 템플릿 본문
```

#### Why
- Label 누락 시 GitHub Issues · PR 필터링 무력화
- 카테고리 통계가 의미 있게 누적되려면 일관 부여 필요

#### How to apply
- 이슈 생성 직후 Label 부여 — 까먹지 않도록 같은 회차에서 처리
- PR 생성 직후 Label 부여 — 닫는 이슈의 Label 과 동기화
- 매핑이 모호하면 가장 큰 변경 의도 prefix 기준으로 분류

<br>

## 적용 흐름 (요약)

사용자 요청 도착 →

1. **의도가 명확한가?** Yes → 진행 / No → 구체화 질문 (규약 2 의 모호 영역)
2. **이슈 생성 + Label 부여** (규약 1 + 규약 6) — 단발은 이슈 1 개 / 큰 작업은 메인 + sub-issue N 개로 분할 후 모두 사전 생성. "이슈 없이 진행해" 명시 시 skip
3. **destructive / 시스템 / 외부 영향?** Yes → 사용자 확인 / No → 진행 (규약 2)
4. **새 권한 / 외부 의존성 필요?** Yes → 스택 명시 의존성이면 자율, 아니면 사용자 확인 (규약 5)
5. **작업 진행** — sub-issue 단위로 branch · 논리 단위마다 commit (규약 3) · 매 단위 lint·type·test 그린 유지
6. **작업 완료 → PR 자동 생성 + Label 부여** (규약 4 + 규약 6) — `Closes #<sub-issue>` 명시, `convention_check.yml` 통과 확인

<br>

## 참고 자료

- 협업 컨벤션 단일 출처: [web/.github](../../.github) (ISSUE_TEMPLATE · PULL_REQUEST_TEMPLATE.md · workflows/convention_check.yml)
- 관련 규약:
  - [06-code-style.md](06-code-style.md) — commit · branch · PR 메시지 컨벤션
  - [05-testing.md](05-testing.md) — 작업 단위 테스트 기준 (빌드 그린)
  - [01-architecture.md](01-architecture.md) — 디렉토리·레이어 (commit 분할 단위 판단)
- 룰셋 개요: [README.md](README.md)

<br>

## 본 룰셋 사용 시 AI 에게 주의 사항

본 룰셋은 **API 범위 내에서 디자인·기능 배치에 집중하는 학습·실습 규모의 티켓팅 웹 프론트엔드** 를 전제로 한다. AI 는 다음을 항상 염두에 둔다.

- "엔터프라이즈급으로 짜줘" 류 요청을 받아도 [README.md 의 "간략화 원칙"](README.md#프로젝트-성격--간략화-원칙-필독) 을 우선 적용
- **백엔드 API 범위 밖 기능을 임의로 추가하지 않는다** — 관리자 대시보드·통계·실시간 푸시·결제 PG 위젯 등은 도입 금지 ([README.md](README.md) 시스템 범위)
- 새 추상 레이어·전역 상태 라이브러리·디자인 패턴은 **실제 사용처 2개 이상 발생 시점**에 도입 (3번 반복 시 추출)
- 룰셋 자체에 적힌 내용도 의심스러우면 더 단순한 쪽으로 — 룰 충돌 시 간략화 원칙 우선
