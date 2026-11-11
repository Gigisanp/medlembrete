import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'medlembrete.db';
export const DATABASE_VERSION = 3;

type MigrationDb = Pick<SQLiteDatabase, 'execAsync' | 'getFirstAsync'>;

/**
 * Cria ou atualiza as tabelas. Roda sempre que o banco abre.
 * Tudo fica no aparelho: não há servidor nem envio de dados.
 * Não existe coluna de dose (quantidade), de propósito.
 */
export async function migrateDbIfNeeded(db: MigrationDb): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= DATABASE_VERSION) return;

  if (current < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS medication_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        time TEXT NOT NULL,
        UNIQUE (medication_id, time)
      );
    `);
  }

  if (current < 2) {
    // Registro de "Já tomei": guarda o horário marcado e a data e hora da confirmação.
    // O nome fica copiado para o histórico continuar legível se o medicamento for removido.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS dose_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER REFERENCES medications(id) ON DELETE SET NULL,
        medication_name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        taken_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS dose_logs_unique
        ON dose_logs (medication_id, scheduled_date, scheduled_time);
      CREATE TABLE IF NOT EXISTS snoozes (
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        until TEXT NOT NULL,
        PRIMARY KEY (scheduled_date, scheduled_time)
      );
    `);
  }

  if (current < 3) {
    // Contatos de ajuda: só nome e telefone, guardados no aparelho.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS help_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
