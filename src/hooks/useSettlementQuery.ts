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
  const startedAt = useRef(Date.now());
  const tracked = useRef(resetKey);

  // resetKey 가 바뀌면 새 폴링 시작 — 타임아웃 기준·상태 리셋
  // (마운트 시점 고정이면 페이지를 오래 열어둔 뒤 시작 시 즉시 타임아웃됨)
  if (resetKey !== tracked.current) {
    tracked.current = resetKey;
    startedAt.current = Date.now();
    if (hasTimedOut) setHasTimedOut(false);
  }

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

  // 타임아웃까지 미정착이면 '지연'으로 표시 (refetchInterval 종료만으로는 리렌더가 안 일어남)
  useEffect(() => {
    if (!enabled || hasTimedOut || query.isSuccess) return;
    const remaining = timeoutMs - (Date.now() - startedAt.current);
    const timer = setTimeout(() => setHasTimedOut(true), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [enabled, hasTimedOut, query.isSuccess, timeoutMs]);

  const retry = () => {
    startedAt.current = Date.now();
    setHasTimedOut(false);
  };

  return { data: query.data, isSettled: query.isSuccess, hasTimedOut, retry };
}
