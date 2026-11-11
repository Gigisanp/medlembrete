import {
  confirmSlot,
  createMedication,
  deleteMedication,
  getSettings,
  listDoseLogsSince,
  listMedications,
  listSnoozesSince,
  markNotificationsAsked,
  saveRepeatMinutes,
  snoozeSlot,
  type Db,
} from '@/db/repository';
import { migrateDbIfNeeded } from '@/db/schema';

import { createTestDatabase, type TestDatabase } from '../test-utils/nodeSqlite';

let raw: TestDatabase;
let db: Db;

beforeEach(async () => {
  raw = createTestDatabase();
  db = raw as unknown as Db;
  await migrateDbIfNeeded(raw);
});

afterEach(() => raw.close());

describe('registro de doses no banco', () => {
  it('"Já tomei" grava cada medicamento do horário com data e hora, sem duplicar', async () => {
    const a = await createMedication(db, { name: 'Remédio A', note: '', times: ['08:00'] });
    const b = await createMedication(db, { name: 'Remédio B', note: '', times: ['08:00'] });
    const takenAt = new Date(2026, 10, 11, 8, 4, 30);
    const medications = [
      { id: a, name: 'Remédio A' },
      { id: b, name: 'Remédio B' },
    ];

    await confirmSlot(db, { date: '2026-11-11', time: '08:00', medications, takenAt });
    await confirmSlot(db, { date: '2026-11-11', time: '08:00', medications, takenAt: new Date() });

    expect(await listDoseLogsSince(db, '2026-11-01')).toEqual([
      { medicationId: a, medicationName: 'Remédio A', date: '2026-11-11', time: '08:00', takenAt: takenAt.toISOString() },
      { medicationId: b, medicationName: 'Remédio B', date: '2026-11-11', time: '08:00', takenAt: takenAt.toISOString() },
    ]);
  });

  it('"Ainda não" guarda o próximo aviso; confirmar depois apaga o adiamento', async () => {
    const a = await createMedication(db, { name: 'Remédio A', note: '', times: ['08:00'] });
    await snoozeSlot(db, { date: '2026-11-11', time: '08:00', until: '2026-11-11T11:10:00.000Z' });
    await snoozeSlot(db, { date: '2026-11-11', time: '08:00', until: '2026-11-11T11:20:00.000Z' });
    expect(await listSnoozesSince(db, '2026-11-11')).toEqual([
      { date: '2026-11-11', time: '08:00', until: '2026-11-11T11:20:00.000Z' },
    ]);

    await confirmSlot(db, {
      date: '2026-11-11',
      time: '08:00',
      medications: [{ id: a, name: 'Remédio A' }],
      takenAt: new Date(),
    });
    expect(await listSnoozesSince(db, '2026-11-11')).toEqual([]);
  });

  it('remover o medicamento mantém o registro com o nome', async () => {
    const a = await createMedication(db, { name: 'Remédio A', note: '', times: ['08:00'] });
    await confirmSlot(db, {
      date: '2026-11-11',
      time: '08:00',
      medications: [{ id: a, name: 'Remédio A' }],
      takenAt: new Date(),
    });
    await deleteMedication(db, a);
    const logs = await listDoseLogsSince(db, '2026-11-01');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ medicationId: null, medicationName: 'Remédio A' });
  });

  it('guarda o intervalo de repetição e se a permissão já foi pedida', async () => {
    expect(await getSettings(db)).toMatchObject({ repeatMinutes: 10, notificationsAsked: false });
    await saveRepeatMinutes(db, 15);
    await markNotificationsAsked(db);
    expect(await getSettings(db)).toMatchObject({ repeatMinutes: 15, notificationsAsked: true });
  });

  it('atualiza um banco da versão 1 sem perder os medicamentos', async () => {
    const old = createTestDatabase();
    await old.execAsync(`
      CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE medications (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
      CREATE TABLE medication_times (id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        time TEXT NOT NULL, UNIQUE (medication_id, time));
      INSERT INTO medications (name, note, created_at) VALUES ('Remédio A', '', '2026-11-01');
      INSERT INTO medication_times (medication_id, time) VALUES (1, '08:00');
      PRAGMA user_version = 1;
    `);
    await migrateDbIfNeeded(old);
    const oldDb = old as unknown as Db;
    expect(await listMedications(oldDb)).toEqual([{ id: 1, name: 'Remédio A', note: '', times: ['08:00'] }]);
    expect(await listDoseLogsSince(oldDb, '2026-01-01')).toEqual([]);
    old.close();
  });
});
