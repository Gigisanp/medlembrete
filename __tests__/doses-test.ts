import {
  dateKey,
  formatCountdown,
  highlightedSlot,
  planNotifications,
  todaySlots,
  type DoseLog,
} from '@/domain/doses';
import type { Medication } from '@/domain/medication';

const at = (h: number, m: number, day = 11) => new Date(2026, 10, day, h, m);
const clock = (d: Date) => `${d.getDate()}/${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const meds: Medication[] = [
  { id: 1, name: 'Remédio A', note: '', times: ['08:00', '20:00'] },
  { id: 2, name: 'Remédio B', note: '', times: ['08:00'] },
];

const log = (medicationId: number, date: string, time: string, takenAt = at(8, 5)): DoseLog => ({
  medicationId,
  medicationName: `Remédio ${medicationId}`,
  date,
  time,
  takenAt: takenAt.toISOString(),
});

describe('planNotifications', () => {
  it('agenda o aviso no horário e repete a cada 10 minutos, 3 vezes', () => {
    const planned = planNotifications({ medications: meds, logs: [], snoozes: [], now: at(7, 0), days: 1, limit: 100 });
    const today8 = planned.filter((p) => p.data.date === '2026-11-11' && p.data.time === '08:00');
    expect(today8.map((p) => clock(p.at))).toEqual(['11/08:00', '11/08:10', '11/08:20', '11/08:30']);
    expect(today8[0].title).toBe('Hora do remédio');
    expect(today8[1].title).toBe('Lembrete: hora do remédio');
  });

  it('junta os medicamentos do mesmo horário em um aviso só', () => {
    const planned = planNotifications({ medications: meds, logs: [], snoozes: [], now: at(7, 0), days: 1, limit: 100 });
    expect(planned[0].body).toBe('08:00 — 2 remédios: Remédio A, Remédio B. Você tomou todos?');
    expect(planned[0].data.count).toBe(2);
    expect(planned[0].id).toBe('dose-2026-11-11-08:00-0');
  });

  it('não agenda nada para um horário já confirmado', () => {
    const logs = [log(1, '2026-11-11', '08:00'), log(2, '2026-11-11', '08:00')];
    const planned = planNotifications({ medications: meds, logs, snoozes: [], now: at(7, 0), days: 1, limit: 100 });
    expect(planned.some((p) => p.data.date === '2026-11-11' && p.data.time === '08:00')).toBe(false);
  });

  it('se só um dos medicamentos do horário foi confirmado, continua avisando', () => {
    const logs = [log(1, '2026-11-11', '08:00')];
    const planned = planNotifications({ medications: meds, logs, snoozes: [], now: at(7, 0), days: 1, limit: 100 });
    expect(planned.some((p) => p.data.time === '08:00' && p.data.date === '2026-11-11')).toBe(true);
  });

  it('depois do horário, mantém só as repetições que ainda não tocaram', () => {
    const planned = planNotifications({ medications: meds, logs: [], snoozes: [], now: at(8, 12), days: 1, limit: 100 });
    const today8 = planned.filter((p) => p.data.date === '2026-11-11' && p.data.time === '08:00');
    expect(today8.map((p) => clock(p.at))).toEqual(['11/08:20', '11/08:30']);
  });

  it('"Ainda não" recomeça as repetições a partir do momento escolhido', () => {
    const snoozes = [{ date: '2026-11-11', time: '08:00', until: at(8, 25).toISOString() }];
    const planned = planNotifications({ medications: meds, logs: [], snoozes, now: at(8, 15), days: 1, limit: 100 });
    const today8 = planned.filter((p) => p.data.date === '2026-11-11' && p.data.time === '08:00');
    expect(today8.map((p) => clock(p.at))).toEqual(['11/08:25', '11/08:35', '11/08:45']);
  });

  it('respeita o intervalo configurado', () => {
    const planned = planNotifications({
      medications: meds,
      logs: [],
      snoozes: [],
      now: at(7, 0),
      days: 1,
      repeatMinutes: 5,
      limit: 100,
    });
    expect(planned.slice(0, 4).map((p) => clock(p.at))).toEqual(['11/08:00', '11/08:05', '11/08:10', '11/08:15']);
  });

  it('cobre a repetição de um horário perto da meia-noite do dia anterior', () => {
    const late: Medication[] = [{ id: 1, name: 'Remédio A', note: '', times: ['23:55'] }];
    const planned = planNotifications({ medications: late, logs: [], snoozes: [], now: at(0, 1, 12), days: 1, limit: 100 });
    expect(planned.slice(0, 3).map((p) => `${p.data.date} ${clock(p.at)}`)).toEqual([
      '2026-11-11 12/00:05',
      '2026-11-11 12/00:15',
      '2026-11-11 12/00:25',
    ]);
  });

  it('agenda vários dias, os mais próximos primeiro, até o limite', () => {
    const planned = planNotifications({ medications: meds, logs: [], snoozes: [], now: at(7, 0), limit: 10 });
    expect(planned).toHaveLength(10);
    const times = planned.map((p) => p.at.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(planned.every((p) => p.at > at(7, 0))).toBe(true);
  });

  it('nenhum aviso fala de dose ou quantidade', () => {
    const planned = planNotifications({ medications: meds, logs: [], snoozes: [], now: at(7, 0), limit: 100 });
    expect(planned.some((p) => /\bdose|mg\b|comprimido/i.test(`${p.title} ${p.body}`))).toBe(false);
  });
});

describe('status do dia', () => {
  it('tomado, pendente e agendado', () => {
    const logs = [log(1, '2026-11-11', '08:00', at(8, 3)), log(2, '2026-11-11', '08:00', at(8, 7))];
    const slots = todaySlots(meds, logs, at(21, 0));
    expect(slots.map((s) => [s.time, s.status])).toEqual([
      ['08:00', 'tomado'],
      ['20:00', 'pendente'],
    ]);
    expect(slots[0].takenAt).toBe(at(8, 7).toISOString());
    expect(todaySlots(meds, [], at(7, 0)).map((s) => s.status)).toEqual(['agendado', 'agendado']);
  });

  it('o destaque é o horário mais antigo de hoje ainda não confirmado', () => {
    expect(highlightedSlot(meds, [], at(9, 0))?.time).toBe('08:00');
    const logs = [log(1, '2026-11-11', '08:00'), log(2, '2026-11-11', '08:00')];
    expect(highlightedSlot(meds, logs, at(9, 0))?.time).toBe('20:00');
    const all = [...logs, log(1, '2026-11-11', '20:00')];
    expect(highlightedSlot(meds, all, at(21, 0))).toBeNull();
  });

  it('dateKey usa o dia local', () => {
    expect(dateKey(at(0, 5))).toBe('2026-11-11');
  });

  it('contagem regressiva', () => {
    expect(formatCountdown(at(7, 0), at(8, 0))).toBe('Daqui a 1 hora');
    expect(formatCountdown(at(6, 0), at(8, 0))).toBe('Daqui a 2 horas');
    expect(formatCountdown(at(7, 0), at(8, 25))).toBe('Daqui a 1 hora e 25 minutos');
    expect(formatCountdown(at(7, 20), at(8, 0))).toBe('Daqui a 40 minutos');
    expect(formatCountdown(at(7, 59), at(8, 0))).toBe('Daqui a 1 minuto');
    expect(formatCountdown(at(8, 0), at(8, 0))).toBe('Agora');
  });
});
