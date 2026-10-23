// Copied from Real Alpha's site (app/src/lib/time.ts) by its scripts/mcp-repo.mjs.
/** 1910 -> "31:50", 3750 -> "1:02:30". Every time on the site is written this way (DESIGN.md › Typography). */
export function timecode(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(total % 60)}` : `${m}:${pad(total % 60)}`;
}

/** 3731 -> "1 h 2 m", 290 -> "5 min", for lines like "5 min instead of 1 h 2 m". */
export function spoken(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} m` : ''}`;
}

/** For screen readers: 3731 -> "1 hour 2 minutes", 290 -> "5 minutes". */
export function inWords(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return h ? `${part(h, 'hour')}${m ? ` ${part(m, 'minute')}` : ''}` : part(Math.max(1, m), 'minute');
}
