import { parseTime, sortTimes, timeToMinutes } from './time';

/**
 * Medicamento como a pessoa digitou a partir da receita.
 * Não existe campo de dose: o app não calcula, não sugere e não guarda doses.
 */
export type Medication = {
  id: number;
  name: string;
  note: string;
  times: string[];
};

export type MedicationInput = Omit<Medication, 'id'>;

/** Texto cru dos campos do formulário, antes da validação. */
export type MedicationDraft = {
  name: string;
  note: string;
  times: string[];
};

export const LIMITS = {
  name: 80,
  note: 300,
  timesPerMedication: 12,
} as const;

export type MedicationErrors = {
  name?: string;
  times?: string;
  /** Um erro por campo de horário, na mesma ordem dos campos. */
  timeItems?: (string | undefined)[];
  note?: string;
};

export type Validation<T, E> = { ok: true; value: T } | { ok: false; errors: E };

export const MESSAGES = {
  nameRequired: 'Digite o nome do medicamento.',
  nameTooLong: `O nome pode ter no máximo ${LIMITS.name} letras.`,
  timesRequired: 'Digite pelo menos um horário.',
  timeInvalid: 'Horário inválido. Digite assim: 08:00 ou 8h30.',
  timeDuplicate: 'Este horário já foi digitado.',
  timesTooMany: `Você pode cadastrar até ${LIMITS.timesPerMedication} horários.`,
  noteTooLong: `A observação pode ter no máximo ${LIMITS.note} letras.`,
  ageInvalid: 'Digite uma idade entre 18 e 120 anos.',
} as const;

/**
 * Valida o que a pessoa digitou. Campos de horário em branco são ignorados.
 * `requireTimes: false` é usado no questionário, quando a pessoa pula os horários.
 */
export function validateMedication(
  draft: MedicationDraft,
  { requireTimes = true }: { requireTimes?: boolean } = {},
): Validation<MedicationInput, MedicationErrors> {
  const errors: MedicationErrors = {};
  const name = draft.name.trim();
  const note = draft.note.trim();

  if (!name) errors.name = MESSAGES.nameRequired;
  else if (name.length > LIMITS.name) errors.name = MESSAGES.nameTooLong;

  if (note.length > LIMITS.note) errors.note = MESSAGES.noteTooLong;

  const seen = new Set<string>();
  const parsed: string[] = [];
  const timeItems = draft.times.map((raw) => {
    if (!raw.trim()) return undefined;
    const time = parseTime(raw);
    if (!time) return MESSAGES.timeInvalid;
    if (seen.has(time)) return MESSAGES.timeDuplicate;
    seen.add(time);
    parsed.push(time);
    return undefined;
  });
  if (timeItems.some(Boolean)) errors.timeItems = timeItems;
  else if (requireTimes && parsed.length === 0) errors.times = MESSAGES.timesRequired;
  else if (parsed.length > LIMITS.timesPerMedication) errors.times = MESSAGES.timesTooMany;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, note, times: sortTimes(parsed) } };
}

/** Idade opcional, só para sugerir o tamanho inicial da letra. */
export function validateAge(raw: string): Validation<number | null, string> {
  const s = raw.trim();
  if (!s) return { ok: true, value: null };
  if (!/^\d{1,3}$/.test(s)) return { ok: false, errors: MESSAGES.ageInvalid };
  const age = Number(s);
  if (age < 18 || age > 120) return { ok: false, errors: MESSAGES.ageInvalid };
  return { ok: true, value: age };
}

export type ScheduleItem = {
  medicationId: number;
  name: string;
  time: string;
};

/** Todos os horários do dia, em ordem. */
export function dailySchedule(medications: Medication[]): ScheduleItem[] {
  return medications
    .flatMap((m) => m.times.map((time) => ({ medicationId: m.id, name: m.name, time })))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time) || a.name.localeCompare(b.name));
}

/** Próximo horário a partir de agora. Se os de hoje já passaram, o primeiro de amanhã. */
export function nextDose(
  medications: Medication[],
  now: Date,
): (ScheduleItem & { tomorrow: boolean }) | null {
  const schedule = dailySchedule(medications);
  if (schedule.length === 0) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = schedule.find((item) => timeToMinutes(item.time) >= nowMinutes);
  return today ? { ...today, tomorrow: false } : { ...schedule[0], tomorrow: true };
}
