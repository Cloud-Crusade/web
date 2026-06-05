import { isAxiosError } from 'axios';

import type { ApiErrorBody } from '@/types/error';

/** 모든 API 실패를 단일 타입으로 정규화한 에러 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
  }
}

const NETWORK_ERROR: ApiErrorBody = {
  code: 'NETWORK_ERROR',
  message: '네트워크 연결을 확인해 주세요',
};

/** unknown 에러 → ApiError 정규화. Query/Mutation·UI 는 이 타입으로만 분기한다. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data as Partial<ApiErrorBody> | undefined;

    if (status === 0 || !body?.code) {
      return new ApiError(status, NETWORK_ERROR);
    }
    return new ApiError(status, {
      code: body.code,
      message: body.message ?? '요청을 처리하지 못했습니다',
      details: body.details,
    });
  }

  return new ApiError(0, { code: 'UNKNOWN', message: '알 수 없는 오류가 발생했습니다' });
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
export const isUnauthorized = (error: ApiError) => error.status === 401;
export const isNotFound = (error: ApiError) => error.status === 404;
export const isSeatTaken = (error: ApiError) => error.code === 'SEAT_ALREADY_TAKEN';
export const isValidationError = (error: ApiError) => error.status === 422;
export const isBackpressure = (error: ApiError) => error.status === 503;
