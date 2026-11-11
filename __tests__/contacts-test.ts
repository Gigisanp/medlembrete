import { createContact, deleteContact, listContacts, updateContact, type Db } from '@/db/repository';
import { migrateDbIfNeeded } from '@/db/schema';
import { CONTACT_MESSAGES, formatPhone, normalizePhone, telUrl, validateContact } from '@/domain/contact';

import { createTestDatabase, type TestDatabase } from '../test-utils/nodeSqlite';

describe('validação de contato', () => {
  it('aceita nome e telefone com DDD e guarda só os números', () => {
    expect(validateContact({ name: ' Maria (filha) ', phone: '(11) 90000-0000' })).toEqual({
      ok: true,
      value: { name: 'Maria (filha)', phone: '11900000000' },
    });
    expect(normalizePhone('+55 11 90000-0000')).toBe('+5511900000000');
  });

  it('exige nome e telefone', () => {
    expect(validateContact({ name: '', phone: '' })).toEqual({
      ok: false,
      errors: { name: CONTACT_MESSAGES.nameRequired, phone: CONTACT_MESSAGES.phoneRequired },
    });
  });

  it.each(['123', '1190000000000000', 'abc12345678', '11 9000-000a'])('recusa telefone "%s"', (phone) => {
    const result = validateContact({ name: 'Maria', phone });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.phone).toBe(CONTACT_MESSAGES.phoneInvalid);
  });

  it('formata para leitura e monta o endereço do discador', () => {
    expect(formatPhone('11900000000')).toBe('(11) 90000-0000');
    expect(formatPhone('1130000000')).toBe('(11) 3000-0000');
    expect(telUrl('11900000000')).toBe('tel:11900000000');
  });
});

describe('contatos no banco', () => {
  let raw: TestDatabase;
  let db: Db;

  beforeEach(async () => {
    raw = createTestDatabase();
    db = raw as unknown as Db;
    await migrateDbIfNeeded(raw);
  });
  afterEach(() => raw.close());

  it('cadastra, lê, edita e remove', async () => {
    const id = await createContact(db, { name: 'Maria', phone: '11900000000' });
    expect(await listContacts(db)).toEqual([{ id, name: 'Maria', phone: '11900000000' }]);
    await updateContact(db, id, { name: 'Maria (filha)', phone: '11900000001' });
    expect(await listContacts(db)).toEqual([{ id, name: 'Maria (filha)', phone: '11900000001' }]);
    await deleteContact(db, id);
    expect(await listContacts(db)).toEqual([]);
  });

  it('a tabela de contatos só tem nome e telefone (mais as colunas técnicas)', async () => {
    const cols = (await raw.getAllAsync<{ name: string }>("SELECT name FROM pragma_table_info('help_contacts')")).map(
      (c) => c.name,
    );
    expect(cols.sort()).toEqual(['created_at', 'id', 'name', 'phone']);
  });

  it('atualiza um banco da versão 2 criando a tabela de contatos', async () => {
    const old = createTestDatabase();
    await old.execAsync(`
      CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE medications (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
      CREATE TABLE medication_times (id INTEGER PRIMARY KEY AUTOINCREMENT, medication_id INTEGER NOT NULL, time TEXT NOT NULL);
      CREATE TABLE dose_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, medication_id INTEGER, medication_name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL, scheduled_time TEXT NOT NULL, taken_at TEXT NOT NULL);
      CREATE TABLE snoozes (scheduled_date TEXT NOT NULL, scheduled_time TEXT NOT NULL, until TEXT NOT NULL,
        PRIMARY KEY (scheduled_date, scheduled_time));
      INSERT INTO medications (name, note, created_at) VALUES ('Remédio A', '', '2026-11-01');
      PRAGMA user_version = 2;
    `);
    await migrateDbIfNeeded(old);
    const oldDb = old as unknown as Db;
    expect(await listContacts(oldDb)).toEqual([]);
    expect((await old.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(3);
    expect(await old.getAllAsync('SELECT name FROM medications')).toEqual([{ name: 'Remédio A' }]);
    old.close();
  });
});
