const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** ISO 문자열을 한국어 날짜·시간으로 포맷. 파싱 실패 시 원본 반환. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateTimeFormat.format(date);
}

export function formatDateRange(startIso: string, endIso: string): string {
  return `${formatDateTime(startIso)} ~ ${formatDateTime(endIso)}`;
}
