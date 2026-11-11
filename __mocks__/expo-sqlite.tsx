/**
 * Mock automático do expo-sqlite para o Jest: usa um SQLite real em memória (node:sqlite).
 * Cada teste pode trocar o banco com `__setTestDatabase`.
 */
import { useEffect, useState, type ReactNode } from 'react';

import { createTestDatabase, type TestDatabase } from '../test-utils/nodeSqlite';

let current: TestDatabase = createTestDatabase();

export function __setTestDatabase(db: TestDatabase) {
  current = db;
}

export function __getTestDatabase() {
  return current;
}

export function useSQLiteContext() {
  return current;
}

export function SQLiteProvider({
  children,
  onInit,
}: {
  children: ReactNode;
  databaseName: string;
  onInit?: (db: TestDatabase) => Promise<void>;
}) {
  const [ready, setReady] = useState(!onInit);
  useEffect(() => {
    if (onInit) onInit(current).then(() => setReady(true));
  }, [onInit]);
  return ready ? <>{children}</> : null;
}
