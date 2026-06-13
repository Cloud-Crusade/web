// 대기열 순번 조회 응답 — 표준 { code, message, data } 엔벨로프.
// WAITING 시 data.queue_number(내 대기 번호) + data.remaining(앞에 남은 인원),
// 입장 완료 시 code === 'COMPLETED' + data.token(예매 입장 토큰).
export interface QueueResponse {
  code: string;
  message: string;
  data?: {
    token?: string;
    queue_number?: number;
    remaining?: number;
  };
}
