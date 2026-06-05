// 대기열 순번 조회 응답 — 표준 { code, message, data } 엔벨로프.
// 입장 완료 시 code === 'COMPLETED' + data.token(예매 입장 토큰).
export interface QueueResponse {
  code: string;
  message: string;
  data?: {
    token?: string;
    position?: number;
  };
}
