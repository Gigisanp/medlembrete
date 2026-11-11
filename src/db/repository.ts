import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_REPEAT_MINUTES, REPEAT_OPTIONS, type DoseLog, type Snooze } from '@/domain/doses';
import type { Medication, MedicationInput } from '@/domain/medication';
import { sortTimes } from '@/domain/time';
import { FONT_SIZE_OPTIONS, type FontSizeOption } from '@/theme/tokens';

type Queryable = Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;

export type Db = Queryable & {
  withExclusiveTransactionAsync(task: (txn: Queryable) => Promise<void>): Promise<void>;
};

export type Settings = {
  onboardingDone: boolean;
  age: number | null;
  fontSize: FontSizeOption | null;
  /** Intervalo de repetição do aviso, em minutos (padrão 10). */
  repeatMinutes: number;
  /** Se a tela que explica e pede a permissão de notificações já foi mostrada. */
  notificationsAsked: boolean;
};

// ---------- Medicamentos ----------

export async function listMedications(db: Queryable): Promise<Medication[]> {
  const meds = await db.getAllAsync<{ id: number; name: string; note: string }>(
    'SELECT id, name, note FROM medications ORDER BY id',
  );
  const times = await db.getAllAsync<{ medication_id: number; time: string }>(
    'SELECT medication_id, time FROM medication_times',
  );
  return meds.map((m) => ({
    ...m,
    times: sortTimes(times.filter((t) => t.medication_id === m.id).map((t) => t.time)),
  }));
}

export async function createMedication(db: Db, input: MedicationInput): Promise<number> {
  let id = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    id = await insertMedication(txn, input);
  });
  return id;
}

export async function updateMedication(db: Db, id: number, input: MedicationInput): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('UPDATE medications SET name = ?, note = ? WHERE id = ?', input.name, input.note, id);
    await txn.runAsync('DELETE FROM medication_times WHERE medication_id = ?', id);
    await insertTimes(txn, id, input.times);
  });
}

export async function deleteMedication(db: Queryable, id: number): Promise<void> {
  // Os horários saem junto (ON DELETE CASCADE).
  await db.runAsync('DELETE FROM medications WHERE id = ?', id);
}

async function insertMedication(db: Queryable, input: MedicationInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO medications (name, note, created_at) VALUES (?, ?, ?)',
    input.name,
    input.note,
    new Date().toISOString(),
  );
  const id = Number(result.lastInsertRowId);
  await insertTimes(db, id, input.times);
  return id;
}

async function insertTimes(db: Queryable, medicationId: number, times: string[]): Promise<void> {
  for (const time of sortTimes(times)) {
    await db.runAsync('INSERT INTO medication_times (medication_id, time) VALUES (?, ?)', medicationId, time);
  }
}

// ---------- Ajustes (configurações guardadas no aparelho) ----------

export async function getSettings(db: Queryable): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const age = map.has('age') ? Number(map.get('age')) : null;
  const fontSize = map.get('font_size') as FontSizeOption | undefined;
  const repeat = Number(map.get('repeat_minutes'));
  return {
    onboardingDone: map.get('onboarding_done') === '1',
    age: age != null && Number.isFinite(age) ? age : null,
    fontSize: fontSize && FONT_SIZE_OPTIONS.includes(fontSize) ? fontSize : null,
    repeatMinutes: (REPEAT_OPTIONS as readonly number[]).includes(repeat) ? repeat : DEFAULT_REPEAT_MINUTES,
    notificationsAsked: map.get('notifications_asked') === '1',
  };
}

export async function saveRepeatMinutes(db: Queryable, minutes: number): Promise<void> {
  await setSetting(db, 'repeat_minutes', String(minutes));
}

export async function markNotificationsAsked(db: Queryable): Promise<void> {
  await setSetting(db, 'notifications_asked', '1');
}

export async function saveFontSize(db: Queryable, fontSize: FontSizeOption): Promise<void> {
  await setSetting(db, 'font_size', fontSize);
}

/**
 * Salva o questionário inicial de uma vez só: idade (se informada), medicamentos e horários.
 * Se der erro no meio, nada é salvo.
 */
export async function completeOnboarding(
  db: Db,
  { age, medications }: { age: number | null; medications: MedicationInput[] },
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    if (age != null) await setSetting(txn, 'age', String(age));
    for (const med of medications) await insertMedication(txn, med);
    await setSetting(txn, 'onboarding_done', '1');
  });
}

// ---------- Doses: "Já tomei" e "Ainda não" ----------

/** Registros desde a data indicada (AAAA-MM-DD), inclusive. */
export async function listDoseLogsSince(db: Queryable, fromDate: string): Promise<DoseLog[]> {
  return db.getAllAsync<DoseLog>(
    `SELECT medication_id AS medicationId, medication_name AS medicationName,
            scheduled_date AS date, scheduled_time AS time, taken_at AS takenAt
       FROM dose_logs WHERE scheduled_date >= ? ORDER BY taken_at`,
    fromDate,
  );
}

/**
 * "Já tomei": registra cada medicamento do horário com a data e hora da confirmação.
 * Confirmar de novo o mesmo horário não duplica o registro.
 */
export async function confirmSlot(
  db: Db,
  {
    date,
    time,
    medications,
    takenAt,
  }: { date: string; time: string; medications: { id: number; name: string }[]; takenAt: Date },
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const med of medications) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO dose_logs
           (medication_id, medication_name, scheduled_date, scheduled_time, taken_at)
         VALUES (?, ?, ?, ?, ?)`,
        med.id,
        med.name,
        date,
        time,
        takenAt.toISOString(),
      );
    }
    await txn.runAsync('DELETE FROM snoozes WHERE scheduled_date = ? AND scheduled_time = ?', date, time);
  });
}

/** "Ainda não": o próximo aviso desse horário toca em `until`. */
export async function snoozeSlot(db: Queryable, { date, time, until }: Snooze): Promise<void> {
  await db.runAsync(
    `INSERT INTO snoozes (scheduled_date, scheduled_time, until) VALUES (?, ?, ?)
     ON CONFLICT(scheduled_date, scheduled_time) DO UPDATE SET until = excluded.until`,
    date,
    time,
    until,
  );
}

export async function listSnoozesSince(db: Queryable, fromDate: string): Promise<Snooze[]> {
  return db.getAllAsync<Snooze>(
    'SELECT scheduled_date AS date, scheduled_time AS time, until FROM snoozes WHERE scheduled_date >= ?',
    fromDate,
  );
}

async function setSetting(db: Queryable, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
