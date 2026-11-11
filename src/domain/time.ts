/**
 * Horários digitados pela pessoa. O app não sugere horários: só entende o que foi digitado
 * e guarda no formato "HH:MM".
 *
 * Formatos aceitos: "8", "08:00", "8:30", "8h", "8h30", "8.30", "0830", "830".
 */
export function parseTime(raw: string): string | null {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/h/g, ':')
    .replace(/\./g, ':')
    .replace(/:$/, '');
  if (!s) return null;

  let match = s.match(/^(\d{1,2})$/);
  let hours: number;
  let minutes: number;
  if (match) {
    hours = Number(match[1]);
    minutes = 0;
  } else if ((match = s.match(/^(\d{1,2}):(\d{2})$/)) || (match = s.match(/^(\d{1,2})(\d{2})$/))) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
  } else {
    return null;
  }

  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Ordena e remove repetidos. */
export function sortTimes(times: string[]): string[] {
  return [...new Set(times)].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
