import {
  completeOnboarding,
  createMedication,
  deleteMedication,
  getSettings,
  listMedications,
  saveFontSize,
  updateMedication,
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

describe('banco local', () => {
  it('cria as tabelas sem nenhuma coluna de dose', async () => {
    const columns = await raw.getAllAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('medications') UNION SELECT name FROM pragma_table_info('medication_times')",
    );
    const names = columns.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['name', 'note', 'time']));
    expect(names.some((n) => /dose|dosage|mg/i.test(n))).toBe(false);
  });

  it('rodar a migração de novo não apaga nada', async () => {
    await createMedication(db, { name: 'Remédio A', note: '', times: ['08:00'] });
    await migrateDbIfNeeded(raw);
    expect(await listMedications(db)).toHaveLength(1);
  });

  it('cria, lê, edita e remove um medicamento', async () => {
    const id = await createMedication(db, { name: 'Remédio A', note: 'após o café', times: ['20:00', '08:00'] });
    expect(await listMedications(db)).toEqual([
      { id, name: 'Remédio A', note: 'após o café', times: ['08:00', '20:00'] },
    ]);

    await updateMedication(db, id, { name: 'Remédio A2', note: '', times: ['09:00'] });
    expect(await listMedications(db)).toEqual([{ id, name: 'Remédio A2', note: '', times: ['09:00'] }]);

    await deleteMedication(db, id);
    expect(await listMedications(db)).toEqual([]);
    const orphanTimes = await raw.getAllAsync('SELECT * FROM medication_times');
    expect(orphanTimes).toEqual([]);
  });

  it('o questionário salva idade, medicamentos e marca como concluído', async () => {
    expect((await getSettings(db)).onboardingDone).toBe(false);

    await completeOnboarding(db, {
      age: 72,
      medications: [
        { name: 'Remédio A', note: '', times: ['08:00'] },
        { name: 'Remédio B', note: '', times: [] },
      ],
    });

    expect(await getSettings(db)).toEqual({
      onboardingDone: true,
      age: 72,
      fontSize: null,
      repeatMinutes: 10,
      notificationsAsked: false,
    });
    const meds = await listMedications(db);
    expect(meds.map((m) => [m.name, m.times])).toEqual([
      ['Remédio A', ['08:00']],
      ['Remédio B', []],
    ]);
  });

  it('se der erro no meio do questionário, nada é salvo', async () => {
    await expect(
      completeOnboarding(db, {
        age: 70,
        medications: [
          { name: 'Remédio A', note: '', times: ['08:00'] },
          // nome nulo viola o NOT NULL da tabela e força o erro no segundo item
          { name: null as unknown as string, note: '', times: ['09:00'] },
        ],
      }),
    ).rejects.toThrow();

    expect(await listMedications(db)).toEqual([]);
    expect(await getSettings(db)).toMatchObject({ onboardingDone: false, age: null, fontSize: null });
  });

  it('guarda o tamanho da letra', async () => {
    await saveFontSize(db, 'muitoGrande');
    expect((await getSettings(db)).fontSize).toBe('muitoGrande');
  });
});
