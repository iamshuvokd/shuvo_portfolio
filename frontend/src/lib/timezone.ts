const FALLBACK = 'UTC';

/** True for real IANA zones ("Asia/Dhaka"). `Intl` throws a RangeError for anything else. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Never throws: an invalid zone falls back to UTC instead of crashing the page. */
export const safeTimeZone = (timeZone: string): string => (isValidTimeZone(timeZone) ? timeZone : FALLBACK);
