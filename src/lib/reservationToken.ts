// 대기열 입장 완료(COMPLETED) 시 발급되는 예매 입장 토큰.
// 이후 요청의 RESERVATION 헤더로 주입되어 API Gateway 가 예매 진입을 허용한다.
const RESERVATION_KEY = 'cc.reservation';

// JWT payload 의 exp(초)만 읽는다 — 서명 검증은 서버(authorizer) 책임, 여기선 만료만 판단한다.
function readExpSeconds(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    // base64url → base64 + atob 가 요구하는 '=' padding 복원(길이 4의 배수가 아닌 payload 디코딩 실패 방지)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

export function getReservationToken(): string | null {
  const token = localStorage.getItem(RESERVATION_KEY);
  if (!token) return null;
  const exp = readExpSeconds(token);
  // exp 가 있고 과거인 경우에만 정리 — exp 없음/파싱불가는 만료로 단정하지 않고 서버(authorizer)가 판정
  if (exp !== null && exp * 1000 <= Date.now()) {
    localStorage.removeItem(RESERVATION_KEY);
    return null;
  }
  return token;
}

export function setReservationToken(token: string): void {
  localStorage.setItem(RESERVATION_KEY, token);
}

export function clearReservationToken(): void {
  localStorage.removeItem(RESERVATION_KEY);
}
