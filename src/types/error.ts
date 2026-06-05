/** 백엔드 표준 에러 응답 바디 — { code, message, details } */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** 422 검증 에러의 필드별 이슈 */
export interface FieldIssue {
  field: string;
  message: string;
}
