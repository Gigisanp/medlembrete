import { addDays, dateKey, formatLongDate, slotDate, type DoseLog } from './doses';
import type { Medication } from './medication';
import { timeToMinutes } from './time';

/**
 * Histórico por dia, montado a partir dos registros de "Já tomei" guardados no aparelho.
 *
 * Estados de cada remédio em cada horário:
 * - "tomado": a pessoa confirmou; mostra a hora real do registro.
 * - "sem-confirmacao": o horário passou e ninguém tocou em "Já tomei".
 *   Isso NÃO quer dizer que a pessoa não tomou; só que não houve confirmação no app.
 * - "agendado": o horário ainda não chegou (só acontece hoje).
 *
 * Os horários previstos de dias anteriores seguem o cadastro atual dos remédios,
 * a partir do dia em que cada remédio foi cadastrado. Registros de remédios removidos
 * ou de horários alterados continuam aparecendo, com o nome guardado no registro.
 */

export const HISTORY_DAYS = 30;

export type HistoryStatus = 'tomado' | 'sem-confirmacao' | 'agendado';

export type HistoryEntry = {
  medicationId: number | null;
  name: string;
  status: HistoryStatus;
  takenAt: string | null;
};

export type HistorySlot = { time: string; at: Date; entries: HistoryEntry[] };

export type HistoryDay = {
  date: string;
  /** "Hoje", "Ontem" ou a data por extenso. */
  title: string;
  /** Data por extenso (para "Hoje" e "Ontem"). */
  subtitle: string | null;
  slots: HistorySlot[];
  confirmed: number;
  /** Quantos horários já passaram (tomados + sem confirmação). */
  past: number;
};

export function buildHistory({
  medications,
  logs,
  now,
  days = HISTORY_DAYS,
}: {
  medications: Medication[];
  logs: DoseLog[];
  now: Date;
  days?: number;
}): HistoryDay[] {
  const result: HistoryDay[] = [];

  for (let i = 0; i < days; i++) {
    const day = addDays(now, -i);
    const date = dateKey(day);
    const bySlot = new Map<string, HistoryEntry[]>();
    const add = (time: string, entry: HistoryEntry) => bySlot.set(time, [...(bySlot.get(time) ?? []), entry]);
    const dayLogs = logs.filter((l) => l.date === date);
    const used = new Set<DoseLog>();

    for (const med of medications) {
      // Não mostra dias anteriores ao cadastro do remédio.
      if (med.createdAt && dateKey(new Date(med.createdAt)) > date) continue;
      for (const time of med.times) {
        const log = dayLogs.find((l) => l.medicationId === med.id && l.time === time);
        if (log) used.add(log);
        add(time, {
          medicationId: med.id,
          name: med.name,
          status: log ? 'tomado' : slotDate(date, time) <= now ? 'sem-confirmacao' : 'agendado',
          takenAt: log?.takenAt ?? null,
        });
      }
    }

    // Registros que não batem com o cadastro atual (remédio removido ou horário mudado).
    for (const log of dayLogs) {
      if (used.has(log)) continue;
      add(log.time, { medicationId: log.medicationId, name: log.medicationName, status: 'tomado', takenAt: log.takenAt });
    }

    if (bySlot.size === 0) continue;

    const slots = [...bySlot.entries()]
      .sort(([a], [b]) => timeToMinutes(a) - timeToMinutes(b))
      .map(([time, entries]) => ({ time, at: slotDate(date, time), entries }));
    const all = slots.flatMap((s) => s.entries);

    result.push({
      date,
      title: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : formatLongDate(day),
      subtitle: i <= 1 ? formatLongDate(day) : null,
      slots,
      confirmed: all.filter((e) => e.status === 'tomado').length,
      past: all.filter((e) => e.status !== 'agendado').length,
    });
  }

  return result;
}
