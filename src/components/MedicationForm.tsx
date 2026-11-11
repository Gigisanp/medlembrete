import { useState } from 'react';

import { EXAMPLE_NAME, EXAMPLE_NOTE } from '@/domain/examples';
import {
  LIMITS,
  validateMedication,
  type MedicationErrors,
  type MedicationInput,
} from '@/domain/medication';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { TextField } from './TextField';
import { TimeInputs } from './TimeInputs';

type Props = {
  initial?: MedicationInput;
  submitLabel: string;
  onSubmit: (input: MedicationInput) => Promise<void>;
};

/**
 * Formulário de cadastro e edição: nome, horário(s) e observação livre.
 * Não há campo de dose.
 */
export function MedicationForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [times, setTimes] = useState<string[]>(initial?.times.length ? initial.times : ['']);
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<MedicationErrors>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const result = validateMedication({ name, times, note });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(result.value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppText>
        Digite o que a sua receita indicou. O app não sugere doses nem horários.
      </AppText>

      <TextField
        label="Nome do medicamento"
        value={name}
        onChangeText={setName}
        placeholder={EXAMPLE_NAME}
        maxLength={LIMITS.name}
        autoCapitalize="sentences"
        error={errors.name}
      />

      <AppText size="heading">Horários</AppText>
      <TimeInputs times={times} onChange={setTimes} error={errors.times} itemErrors={errors.timeItems} />

      <TextField
        label="Observação (opcional)"
        value={note}
        onChangeText={setNote}
        placeholder={EXAMPLE_NOTE}
        maxLength={LIMITS.note}
        multiline
        error={errors.note}
      />

      <AppText muted>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>

      <AppButton label={submitLabel} variant="primary" onPress={handleSubmit} disabled={saving} />
    </>
  );
}
