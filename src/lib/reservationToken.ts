// 대기열 입장 완료(COMPLETED) 시 발급되는 예매 입장 토큰.
// 이후 요청의 RESERVATION 헤더로 주입되어 API Gateway 가 예매 진입을 허용한다.
const RESERVATION_KEY = 'cc.reservation';

export function getReservationToken(): string | null {
  return localStorage.getItem(RESERVATION_KEY);
}

export function setReservationToken(token: string): void {
  localStorage.setItem(RESERVATION_KEY, token);
}

export function clearReservationToken(): void {
  localStorage.removeItem(RESERVATION_KEY);
}
