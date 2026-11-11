import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EXAMPLE_NAME, EXAMPLE_NOTE } from '@/domain/examples';
import {
  LIMITS,
  validateMedication,
  type MedicationErrors,
  type MedicationInput,
} from '@/domain/medication';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { TextField } from './TextField';
import { TimeInputs } from './TimeInputs';
import { useLeaveGuard } from './useLeaveGuard';

type Props = {
  initial?: MedicationInput;
  submitLabel: string;
  /** Salva no banco. Se der erro, o formulário mostra a mensagem e mantém o que foi digitado. */
  onSave: (input: MedicationInput) => Promise<void>;
  /** Chamado depois de salvar, para navegar. */
  onSaved: () => void;
  /** Desliga a pergunta de "sair sem salvar" (ex.: durante a remoção do medicamento). */
  allowLeave?: boolean;
};

function sameTimes(a: string[], b: string[]) {
  const clean = (list: string[]) => list.map((t) => t.trim()).filter(Boolean).join('|');
  return clean(a) === clean(b);
}

/**
 * Formulário de cadastro e edição: nome, horário(s) e observação livre.
 * Não há campo de dose. Ao tentar sair com alterações não salvas, pergunta antes.
 */
export function MedicationForm({ initial, submitLabel, onSave, onSaved, allowLeave }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [times, setTimes] = useState<string[]>(initial?.times.length ? initial.times : ['']);
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<MedicationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const dirty =
    name.trim() !== (initial?.name ?? '') ||
    note.trim() !== (initial?.note ?? '') ||
    !sameTimes(times, initial?.times ?? []);

  const guard = useLeaveGuard(dirty && !allowLeave);

  async function handleSubmit() {
    const result = validateMedication({ name, times, note });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveError(false);
    setSaving(true);
    guard.allowLeave();
    try {
      await onSave(result.value);
    } catch {
      setSaveError(true);
      guard.blockLeave();
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  }

  return (
    <>
      <Card tone="lilac">
        <AppText>Digite o que a sua receita indicou. O app não sugere doses nem horários.</AppText>
      </Card>

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

      {saveError ? (
        <View style={[styles.error, { backgroundColor: colors.dangerSurface }]}>
          <AppText bold color="dangerText" accessibilityLiveRegion="polite">
            ⚠ Não foi possível salvar. O que você digitou continua aqui. Tente de novo.
          </AppText>
        </View>
      ) : null}

      <AppButton
        label={submitLabel}
        variant="primary"
        icon="checkmark"
        onPress={handleSubmit}
        loading={saving}
        loadingLabel="Salvando…"
      />
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
