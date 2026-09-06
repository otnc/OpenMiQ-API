/** Short unit suffixes used to render a countdown, e.g. "1d 3h 20m". */
export interface DurationUnitLabels {
  day: string;
  hour: string;
  minute: string;
}

/**
 * Formats a duration for a "resets in ..." countdown.
 * Rounds up to the nearest minute so a window that resets in 10 seconds still reads as "1m" rather than "0m" (which would look like it already reset).
 */
export function formatDuration(ms: number, labels: DurationUnitLabels): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}${labels.day}`);
  if (hours > 0) parts.push(`${hours}${labels.hour}`);
  if (minutes > 0 || parts.length === 0)
    parts.push(`${minutes}${labels.minute}`);
  return parts.join(" ");
}
