import type { DoseLog } from '@/domain/doses';
import { buildHistory } from '@/domain/history';
import type { Medication } from '@/domain/medication';

const NOW = new Date(2026, 10, 11, 9, 0); // quarta-feira, 11/11/2026, 09:00
const created = new Date(2026, 10, 9, 7, 0).toISOString(); // cadastrados em 09/11

const meds: Medication[] = [
  { id: 1, name: 'Remédio A', note: '', times: ['08:00', '20:00'], createdAt: created },
  { id: 2, name: 'Remédio B', note: '', times: ['08:00'], createdAt: created },
];

const log = (medicationId: number | null, medicationName: string, date: string, time: string, takenAt: Date): DoseLog => ({
  medicationId,
  medicationName,
  date,
  time,
  takenAt: takenAt.toISOString(),
});

describe('buildHistory', () => {
  it('organiza por dia, do mais recente para o mais antigo, a partir do cadastro', () => {
    const days = buildHistory({ medications: meds, logs: [], now: NOW, days: 30 });
    expect(days.map((d) => [d.date, d.title])).toEqual([
      ['2026-11-11', 'Hoje'],
      ['2026-11-10', 'Ontem'],
      ['2026-11-09', 'Segunda-feira, 9 de novembro'],
    ]);
    expect(days[0].subtitle).toBe('Quarta-feira, 11 de novembro');
  });

  it('mostra horário previsto, cada remédio, confirmação e hora real do registro', () => {
    const logs = [log(1, 'Remédio A', '2026-11-10', '08:00', new Date(2026, 10, 10, 8, 7))];
    const ontem = buildHistory({ medications: meds, logs, now: NOW })[1];
    expect(ontem.slots.map((s) => s.time)).toEqual(['08:00', '20:00']);
    expect(ontem.slots[0].entries).toEqual([
      { medicationId: 1, name: 'Remédio A', status: 'tomado', takenAt: new Date(2026, 10, 10, 8, 7).toISOString() },
      { medicationId: 2, name: 'Remédio B', status: 'sem-confirmacao', takenAt: null },
    ]);
    expect(ontem.slots[1].entries[0].status).toBe('sem-confirmacao');
    expect([ontem.confirmed, ontem.past]).toEqual([1, 3]);
  });

  it('hoje, diferencia horário passado sem confirmação de horário que ainda vai chegar', () => {
    const hoje = buildHistory({ medications: meds, logs: [], now: NOW })[0];
    expect(hoje.slots.map((s) => [s.time, s.entries.map((e) => e.status)])).toEqual([
      ['08:00', ['sem-confirmacao', 'sem-confirmacao']],
      ['20:00', ['agendado']],
    ]);
    expect(hoje.past).toBe(2);
  });

  it('mantém registros de remédio removido ou de horário alterado, com o nome guardado', () => {
    const logs = [
      log(null, 'Remédio removido', '2026-11-10', '12:00', new Date(2026, 10, 10, 12, 3)),
      log(1, 'Remédio A', '2026-11-10', '07:30', new Date(2026, 10, 10, 7, 31)),
    ];
    const ontem = buildHistory({ medications: meds, logs, now: NOW })[1];
    const flat = ontem.slots.flatMap((s) => s.entries.map((e) => `${s.time} ${e.name} ${e.status}`));
    expect(flat).toContain('12:00 Remédio removido tomado');
    expect(flat).toContain('07:30 Remédio A tomado');
  });

  it('sem remédios nem registros, não inventa dias', () => {
    expect(buildHistory({ medications: [], logs: [], now: NOW })).toEqual([]);
  });

  it('remédio sem horário não gera linhas no histórico', () => {
    const semHorario: Medication[] = [{ id: 3, name: 'Remédio C', note: '', times: [], createdAt: created }];
    expect(buildHistory({ medications: semHorario, logs: [], now: NOW })).toEqual([]);
  });
});
