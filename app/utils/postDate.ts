/** Formats an ISO post date as e.g. "Sep 18, 2026" (fixed locale/time zone so SSR and client match). */
export function formatPostDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
