/**
 * Banco SQLite real em memória (node:sqlite) com a mesma interface assíncrona do expo-sqlite
 * usada pelo app. Permite testar o SQL de verdade no Jest, sem o módulo nativo.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

type Param = string | number | null;

function flatten(params: unknown[]): Param[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as Param[];
  return params as Param[];
}

function plain<T>(row: unknown): T {
  return row == null ? (row as T) : ({ ...(row as object) } as T);
}

export type TestDatabase = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  withExclusiveTransactionAsync(task: (txn: TestDatabase) => Promise<void>): Promise<void>;
  close(): void;
};

export function createTestDatabase(): TestDatabase {
  const native = new DatabaseSync(':memory:');

  const db: TestDatabase = {
    async execAsync(source: string) {
      native.exec(source);
    },
    async runAsync(source: string, ...params: unknown[]) {
      const result = native.prepare(source).run(...flatten(params));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
      const row = native.prepare(source).get(...flatten(params));
      return row ? plain<T>(row) : null;
    },
    async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
      return native.prepare(source).all(...flatten(params)).map((r: unknown) => plain<T>(r));
    },
    async withExclusiveTransactionAsync(task: (txn: TestDatabase) => Promise<void>) {
      native.exec('BEGIN');
      try {
        await task(db);
        native.exec('COMMIT');
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      native.close();
    },
  };
  return db;
}
