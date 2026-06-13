import { type QueryKey, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

type Options<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  // 폴링 대상 식별자 — 바뀌면 새 폴링으로 보고 타임아웃 기준을 리셋한다
  resetKey: string | undefined;
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
};

type Result<T> = {
  data: T | undefined;
  isSettled: boolean;
  hasTimedOut: boolean;
  retry: () => void;
};

// 202 비동기 정착 폴링 공통 훅 (02/03/09 룰셋).
// 단건이 success(200)로 잡힐 때까지 폴링하고, timeoutMs 내 미정착이면 hasTimedOut 으로 '지연'을 구분한다.
export function useSettlementQuery<T>({
  queryKey,
  queryFn,
  resetKey,
  enabled,
  intervalMs,
  timeoutMs,
}: Options<T>): Result<T> {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  // resetKey 변경·retry 마다 증가 → 타임아웃 타이머를 재시작하는 트리거
  const [epoch, setEpoch] = useState(0);
  const startedAt = useRef(Date.now());

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: enabled && !hasTimedOut,
    staleTime: 0,
    retry: false,
    refetchInterval: (q) => {
      if (q.state.status === 'success') return false; // 정착 → 폴링 종료
      if (Date.now() - startedAt.current > timeoutMs) return false; // 타임아웃 → 폴링 종료
      return intervalMs; // 미정착(404 등) → 계속 폴링
    },
  });

  // resetKey 변경 = 새 폴링 대상 → 타임아웃 기준·상태 리셋(effect 에서, render-phase update 회피).
  // (마운트 시점 고정이면 페이지를 오래 열어둔 뒤 시작 시 즉시 타임아웃됨)
  useEffect(() => {
    startedAt.current = Date.now();
    setHasTimedOut(false);
    setEpoch((e) => e + 1);
  }, [resetKey]);

  // 타임아웃 타이머 — epoch(대상 변경·재시도) 가 바뀌면 이전 타이머 정리 후 새 기준으로 재스케줄.
  useEffect(() => {
    if (!enabled || query.isSuccess) return;
    const remaining = Math.max(0, timeoutMs - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setHasTimedOut(true), remaining);
    return () => clearTimeout(timer);
  }, [enabled, query.isSuccess, timeoutMs, epoch]);

  const retry = () => {
    startedAt.current = Date.now();
    setHasTimedOut(false); // 폴링 재개(enabled 복원) + 즉시 재조회
    setEpoch((e) => e + 1); // 타임아웃 타이머 재시작
  };

  return { data: query.data, isSettled: query.isSuccess, hasTimedOut, retry };
}
