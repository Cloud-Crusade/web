// 대기열 입장 완료(COMPLETED) 시 발급되는 예매 입장 토큰.
// 이후 요청의 RESERVATION 헤더로 주입되어 API Gateway 가 예매 진입을 허용한다.
const RESERVATION_KEY = 'cc.reservation';

// JWT payload 의 exp(초)만 읽는다 — 서명 검증은 서버(authorizer) 책임, 여기선 만료만 판단한다.
function readExpSeconds(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: unknown;
    };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

export function getReservationToken(): string | null {
  const token = localStorage.getItem(RESERVATION_KEY);
  if (!token) return null;
  const exp = readExpSeconds(token);
  // exp 없음(손상/구버전) 또는 만료 → 정리하고 없는 것으로 취급(만료 토큰을 서버로 보내지 않는다)
  if (exp === null || exp * 1000 <= Date.now()) {
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
