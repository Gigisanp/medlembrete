import {
  dailySchedule,
  MESSAGES,
  nextDose,
  validateAge,
  validateMedication,
  type Medication,
} from '@/domain/medication';
import { parseTime, sortTimes } from '@/domain/time';

describe('parseTime', () => {
  it.each([
    ['8', '08:00'],
    ['08:00', '08:00'],
    ['8:30', '08:30'],
    ['8h', '08:00'],
    ['8h30', '08:30'],
    ['8.30', '08:30'],
    ['0830', '08:30'],
    ['830', '08:30'],
    [' 22:15 ', '22:15'],
    ['0', '00:00'],
  ])('"%s" vira %s', (raw, expected) => {
    expect(parseTime(raw)).toBe(expected);
  });

  it.each(['', '24:00', '12:60', 'abc', '8:5', '123456', '-1'])('"%s" é inválido', (raw) => {
    expect(parseTime(raw)).toBeNull();
  });

  it('sortTimes ordena e tira repetidos', () => {
    expect(sortTimes(['20:00', '08:00', '20:00', '12:30'])).toEqual(['08:00', '12:30', '20:00']);
  });
});

describe('validateMedication', () => {
  it('aceita nome e horários, normaliza e ordena', () => {
    const result = validateMedication({ name: '  Remédio A ', times: ['20h', '8', ''], note: ' após o café ' });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Remédio A', times: ['08:00', '20:00'], note: 'após o café' },
    });
  });

  it('exige nome', () => {
    const result = validateMedication({ name: '  ', times: ['08:00'], note: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBe(MESSAGES.nameRequired);
  });

  it('exige pelo menos um horário no cadastro', () => {
    const result = validateMedication({ name: 'Remédio A', times: ['', ' '], note: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.times).toBe(MESSAGES.timesRequired);
  });

  it('permite ficar sem horário quando a pessoa pula no questionário', () => {
    const result = validateMedication({ name: 'Remédio A', times: [''], note: '' }, { requireTimes: false });
    expect(result.ok && result.value.times).toEqual([]);
  });

  it('aponta o campo do horário inválido e o repetido', () => {
    const result = validateMedication({ name: 'Remédio A', times: ['08:00', '25:00', '8h'], note: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.timeItems).toEqual([undefined, MESSAGES.timeInvalid, MESSAGES.timeDuplicate]);
    }
  });

  it('limita o tamanho da observação', () => {
    const result = validateMedication({ name: 'Remédio A', times: ['8'], note: 'x'.repeat(301) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.note).toBe(MESSAGES.noteTooLong);
  });

  it('o resultado não tem nenhum campo de dose', () => {
    const result = validateMedication({ name: 'Remédio A', times: ['8'], note: '' });
    expect(result.ok && Object.keys(result.value).sort()).toEqual(['name', 'note', 'times']);
  });
});

describe('validateAge', () => {
  it('idade em branco é permitida (passo pulado)', () => {
    expect(validateAge('')).toEqual({ ok: true, value: null });
  });

  it.each(['18', '60', '120'])('aceita %s', (raw) => {
    expect(validateAge(raw)).toEqual({ ok: true, value: Number(raw) });
  });

  it.each(['17', '121', 'abc', '6.5', '-20'])('recusa %s', (raw) => {
    expect(validateAge(raw)).toEqual({ ok: false, errors: MESSAGES.ageInvalid });
  });
});

describe('horários do dia', () => {
  const meds: Medication[] = [
    { id: 1, name: 'Remédio B', note: '', times: ['20:00', '08:00'] },
    { id: 2, name: 'Remédio A', note: '', times: ['12:00'] },
    { id: 3, name: 'Remédio C', note: '', times: [] },
  ];
  const at = (h: number, m: number) => new Date(2026, 10, 11, h, m);

  it('lista em ordem de horário', () => {
    expect(dailySchedule(meds).map((i) => `${i.time} ${i.name}`)).toEqual([
      '08:00 Remédio B',
      '12:00 Remédio A',
      '20:00 Remédio B',
    ]);
  });

  it('próximo horário é o primeiro que ainda não passou', () => {
    expect(nextDose(meds, at(9, 0))).toMatchObject({ time: '12:00', name: 'Remédio A', tomorrow: false });
    expect(nextDose(meds, at(12, 0))).toMatchObject({ time: '12:00', tomorrow: false });
  });

  it('depois do último horário, mostra o primeiro de amanhã', () => {
    expect(nextDose(meds, at(21, 0))).toMatchObject({ time: '08:00', tomorrow: true });
  });

  it('sem horários, não há próximo', () => {
    expect(nextDose([], at(9, 0))).toBeNull();
  });
});
