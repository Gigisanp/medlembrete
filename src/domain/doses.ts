import type { Medication } from './medication';
import { timeToMinutes } from './time';

/**
 * Regras dos avisos e das confirmações de dose.
 * "Dose" aqui é só o horário que a pessoa cadastrou; o app não sabe nem sugere quantidade.
 */

/** Quantas vezes o aviso repete se a pessoa não confirmar. */
export const REPEAT_COUNT = 3;
export const DEFAULT_REPEAT_MINUTES = 10;
export const REPEAT_OPTIONS = [5, 10, 15, 30] as const;
/** Quantos dias à frente os avisos são agendados (limitado pelo máximo do sistema). */
export const PLANNING_DAYS = 7;

export type DoseLog = {
  medicationId: number | null;
  medicationName: string;
  date: string; // AAAA-MM-DD do horário marcado
  time: string; // HH:MM do horário marcado
  takenAt: string; // data e hora (ISO) em que a pessoa confirmou
};

export type Snooze = {
  date: string;
  time: string;
  /** Quando o próximo aviso deve tocar (ISO). */
  until: string;
};

/** Um horário de um dia, com todos os medicamentos marcados para ele. */
export type Slot = {
  date: string;
  time: string;
  at: Date;
  medications: { id: number; name: string }[];
};

export type SlotStatus = 'tomado' | 'pendente' | 'agendado';

export type SlotWithStatus = Slot & { status: SlotStatus; takenAt: string | null };

export type PlannedNotification = {
  id: string;
  at: Date;
  title: string;
  body: string;
  data: { kind: 'dose'; date: string; time: string; attempt: number };
};

// ---------- Datas ----------

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function slotDate(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "daqui a 1 h 20 min", "daqui a 5 min", "agora". */
export function formatCountdown(from: Date, to: Date): string {
  const minutes = Math.ceil((to.getTime() - from.getTime()) / 60_000);
  if (minutes <= 0) return 'agora';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `daqui a ${m} min`;
  return m === 0 ? `daqui a ${h} h` : `daqui a ${h} h ${m} min`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ---------- Horários e status ----------

/** Horários de `days` dias a partir do dia de `from`, agrupando medicamentos do mesmo horário. */
export function slotsForDays(medications: Medication[], from: Date, days: number): Slot[] {
  const byTime = new Map<string, { id: number; name: string }[]>();
  for (const med of medications) {
    for (const time of med.times) {
      byTime.set(time, [...(byTime.get(time) ?? []), { id: med.id, name: med.name }]);
    }
  }
  const times = [...byTime.keys()].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

  const slots: Slot[] = [];
  for (let i = 0; i < days; i++) {
    const date = dateKey(addDays(from, i));
    for (const time of times) {
      slots.push({ date, time, at: slotDate(date, time), medications: byTime.get(time)! });
    }
  }
  return slots;
}

/** Tomado só quando todos os medicamentos daquele horário foram confirmados. */
export function withStatus(slot: Slot, logs: DoseLog[], now: Date): SlotWithStatus {
  const slotLogs = logs.filter((l) => l.date === slot.date && l.time === slot.time);
  const allTaken = slot.medications.every((m) => slotLogs.some((l) => l.medicationId === m.id));
  if (allTaken && slotLogs.length > 0) {
    const takenAt = slotLogs.map((l) => l.takenAt).sort().at(-1)!;
    return { ...slot, status: 'tomado', takenAt };
  }
  return { ...slot, status: slot.at <= now ? 'pendente' : 'agendado', takenAt: null };
}

export function todaySlots(medications: Medication[], logs: DoseLog[], now: Date): SlotWithStatus[] {
  return slotsForDays(medications, now, 1).map((s) => withStatus(s, logs, now));
}

/**
 * Horário em destaque na tela Hoje: o mais antigo de hoje ainda não confirmado
 * (já passou ou ainda vai chegar). Se não houver, null.
 */
export function highlightedSlot(medications: Medication[], logs: DoseLog[], now: Date): SlotWithStatus | null {
  return todaySlots(medications, logs, now).find((s) => s.status !== 'tomado') ?? null;
}

/** Primeiro horário de amanhã, para mostrar quando hoje já acabou. */
export function firstSlotTomorrow(medications: Medication[], now: Date): Slot | null {
  return slotsForDays(medications, addDays(now, 1), 1)[0] ?? null;
}

// ---------- Agendamento dos avisos ----------

export function notificationId(date: string, time: string, attempt: number): string {
  return `dose-${date}-${time}-${attempt}`;
}

/**
 * Lista de avisos que devem estar agendados agora:
 * - um aviso no horário de cada dose ainda não confirmada;
 * - repetições a cada `repeatMinutes` (padrão 10), até `REPEAT_COUNT` vezes;
 * - se a pessoa tocou em "Ainda não", as repetições recomeçam a partir desse momento.
 * Só entram avisos no futuro, os mais próximos primeiro, até `limit`.
 */
export function planNotifications({
  medications,
  logs,
  snoozes,
  now,
  repeatMinutes = DEFAULT_REPEAT_MINUTES,
  repeatCount = REPEAT_COUNT,
  days = PLANNING_DAYS,
  limit,
}: {
  medications: Medication[];
  logs: DoseLog[];
  snoozes: Snooze[];
  now: Date;
  repeatMinutes?: number;
  repeatCount?: number;
  days?: number;
  limit: number;
}): PlannedNotification[] {
  const interval = repeatMinutes * 60_000;
  const planned: PlannedNotification[] = [];

  // Começa em ontem para cobrir repetições de doses perto da meia-noite.
  for (const slot of slotsForDays(medications, addDays(now, -1), days + 1)) {
    if (withStatus(slot, logs, now).status === 'tomado') continue;

    const names = slot.medications.map((m) => m.name).join(', ');
    const snooze = snoozes.find((s) => s.date === slot.date && s.time === slot.time);
    const firstRepeat = snooze ? new Date(snooze.until).getTime() : slot.at.getTime() + interval;

    const attempts: Date[] = [slot.at];
    for (let k = 0; k < repeatCount; k++) attempts.push(new Date(firstRepeat + k * interval));

    attempts.forEach((at, attempt) => {
      if (at <= now) return;
      planned.push({
        id: notificationId(slot.date, slot.time, attempt),
        at,
        title: attempt === 0 ? 'Hora do remédio' : 'Lembrete: hora do remédio',
        body: `${slot.time} — ${names}. Você já tomou?`,
        data: { kind: 'dose', date: slot.date, time: slot.time, attempt },
      });
    });
  }

  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}
