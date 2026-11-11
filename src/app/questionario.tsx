import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TimeInputs } from '@/components/TimeInputs';
import { useAppData } from '@/data/AppDataProvider';
import { EXAMPLE_NAME, EXAMPLE_NOTE } from '@/domain/examples';
import {
  LIMITS,
  MESSAGES,
  validateAge,
  validateMedication,
  type MedicationErrors,
  type MedicationInput,
} from '@/domain/medication';
import { useTheme } from '@/theme/ThemeProvider';
import { initialFontSizeForAge, radius, spacing } from '@/theme/tokens';

type Step =
  | { kind: 'age' }
  | { kind: 'names' }
  | { kind: 'times'; index: number }
  | { kind: 'summary' };

type Draft = { name: string; times: string[]; note: string };

const TOTAL_STEPS = 4;
const emptyDraft = (): Draft => ({ name: '', times: [''], note: '' });

/**
 * Questionário da primeira abertura. Uma pergunta por tela, cada passo pode ser pulado.
 * Não pede dose, e o app não sugere doses nem horários.
 */
export default function OnboardingScreen() {
  const { completeOnboarding, setFontSize, settings } = useAppData();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>({ kind: 'age' });
  const [ageText, setAgeText] = useState('');
  const [ageError, setAgeError] = useState<string>();
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [nameErrors, setNameErrors] = useState<(string | undefined)[]>([]);
  const [timeErrors, setTimeErrors] = useState<MedicationErrors>({});
  const [saving, setSaving] = useState(false);

  const updateDraft = (index: number, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const goToTimesOrSummary = (index: number, list: Draft[]) => {
    setTimeErrors({});
    setStep(index < list.length ? { kind: 'times', index } : { kind: 'summary' });
  };

  // ---------- Passo 1: idade ----------
  function submitAge() {
    const result = validateAge(ageText);
    if (!result.ok) {
      setAgeError(result.errors);
      return;
    }
    setAgeError(undefined);
    // Só sugere letra maior; não diminui uma escolha que a pessoa já fez.
    if (initialFontSizeForAge(result.value) === 'grande' && (settings.fontSize ?? 'normal') === 'normal') {
      setFontSize('grande');
    }
    setStep({ kind: 'names' });
  }

  // ---------- Passo 2: nomes ----------
  function submitNames() {
    const errors = drafts.map((d) => (d.name.trim().length > LIMITS.name ? MESSAGES.nameTooLong : undefined));
    if (errors.some(Boolean)) {
      setNameErrors(errors);
      return;
    }
    setNameErrors([]);
    const filled = drafts.filter((d) => d.name.trim());
    setDrafts(filled.length ? filled : [emptyDraft()]);
    if (filled.length === 0) setStep({ kind: 'summary' });
    else goToTimesOrSummary(0, filled);
  }

  function skipNames() {
    setNameErrors([]);
    setDrafts([emptyDraft()]);
    setStep({ kind: 'summary' });
  }

  // ---------- Passo 3: horários de cada medicamento ----------
  function submitTimes(index: number) {
    const result = validateMedication(drafts[index]);
    if (!result.ok) {
      setTimeErrors(result.errors);
      return;
    }
    const list = drafts.map((d, i) =>
      i === index ? { ...d, times: result.value.times, note: result.value.note } : d,
    );
    setDrafts(list);
    goToTimesOrSummary(index + 1, list);
  }

  function skipTimes(index: number) {
    const list = drafts.map((d, i) => (i === index ? { ...d, times: [''] } : d));
    setDrafts(list);
    goToTimesOrSummary(index + 1, list);
  }

  // ---------- Passo 4: resumo ----------
  const medicationsToSave: MedicationInput[] = drafts
    .filter((d) => d.name.trim())
    .map((d) => {
      const result = validateMedication(d, { requireTimes: false });
      return result.ok ? result.value : { name: d.name.trim(), note: d.note.trim(), times: [] };
    });
  const age = validateAge(ageText);

  async function confirm() {
    setSaving(true);
    try {
      await completeOnboarding({ age: age.ok ? age.value : null, medications: medicationsToSave });
      // Primeira abertura: não há tela anterior. Ao refazer pela aba Ajustes: volta para Hoje.
      if (router.canDismiss()) router.dismissAll();
      else router.replace('/');
    } finally {
      setSaving(false);
    }
  }

  const stepNumber = { age: 1, names: 2, times: 3, summary: 4 }[step.kind];

  return (
    <Screen>
      <AppText muted>{`Passo ${stepNumber} de ${TOTAL_STEPS}`}</AppText>

      {step.kind === 'age' ? (
        <>
          <AppText size="title">Qual é a sua idade?</AppText>
          <AppText>
            Usamos a idade só para escolher o tamanho inicial da letra. Você pode mudar depois.
          </AppText>
          <TextField
            label="Idade em anos"
            value={ageText}
            onChangeText={setAgeText}
            keyboardType="number-pad"
            maxLength={3}
            error={ageError}
          />
          <AppButton label="Continuar" variant="primary" onPress={submitAge} />
          <AppButton
            label="Pular"
            onPress={() => {
              setAgeText('');
              setAgeError(undefined);
              setStep({ kind: 'names' });
            }}
          />
        </>
      ) : null}

      {step.kind === 'names' ? (
        <>
          <AppText size="title">Quais medicamentos você usa?</AppText>
          <AppText>Escreva o nome como está na receita. Um por campo.</AppText>
          {drafts.map((draft, index) => (
            <View key={index} style={styles.group}>
              <TextField
                label={`Medicamento ${index + 1}`}
                value={draft.name}
                onChangeText={(name) => updateDraft(index, { name })}
                placeholder={EXAMPLE_NAME}
                maxLength={LIMITS.name}
                error={nameErrors[index]}
              />
              {drafts.length > 1 ? (
                <AppButton
                  label={`Remover medicamento ${index + 1}`}
                  onPress={() => setDrafts((list) => list.filter((_, i) => i !== index))}
                />
              ) : null}
            </View>
          ))}
          <AppButton label="Adicionar outro" onPress={() => setDrafts((list) => [...list, emptyDraft()])} />
          <AppButton label="Continuar" variant="primary" onPress={submitNames} />
          <AppButton label="Pular" onPress={skipNames} />
          <AppButton label="Voltar" onPress={() => setStep({ kind: 'age' })} />
        </>
      ) : null}

      {step.kind === 'times' ? (
        <>
          <AppText muted>{`Medicamento ${step.index + 1} de ${drafts.length}`}</AppText>
          <AppText size="title">{`Em que horários você toma ${drafts[step.index].name.trim()}?`}</AppText>
          <TimeInputs
            times={drafts[step.index].times.length ? drafts[step.index].times : ['']}
            onChange={(times) => updateDraft(step.index, { times })}
            error={timeErrors.times}
            itemErrors={timeErrors.timeItems}
          />
          <TextField
            label="Observação (opcional)"
            value={drafts[step.index].note}
            onChangeText={(note) => updateDraft(step.index, { note })}
            placeholder={EXAMPLE_NOTE}
            maxLength={LIMITS.note}
            multiline
            error={timeErrors.note}
          />
          <AppButton label="Continuar" variant="primary" onPress={() => submitTimes(step.index)} />
          <AppButton label="Pular" onPress={() => skipTimes(step.index)} />
          <AppButton
            label="Voltar"
            onPress={() => {
              setTimeErrors({});
              setStep(step.index === 0 ? { kind: 'names' } : { kind: 'times', index: step.index - 1 });
            }}
          />
        </>
      ) : null}

      {step.kind === 'summary' ? (
        <>
          <AppText size="title">Confira os dados</AppText>
          <AppText bold>Estes são os horários que a sua receita indicou. Confira com atenção.</AppText>

          {age.ok && age.value != null ? <AppText>{`Idade: ${age.value} anos`}</AppText> : null}

          {medicationsToSave.length === 0 ? (
            <AppText>Nenhum medicamento informado. Você pode cadastrar depois, na aba Remédios.</AppText>
          ) : (
            medicationsToSave.map((med, index) => (
              <View key={index} style={[styles.summaryItem, { borderColor: colors.border }]}>
                <AppText bold>{med.name}</AppText>
                <AppText>
                  {med.times.length ? `Horários: ${med.times.join(', ')}` : 'Sem horário. Você pode adicionar depois, na aba Remédios.'}
                </AppText>
                {med.note ? <AppText muted>{`Observação: ${med.note}`}</AppText> : null}
              </View>
            ))
          )}

          <AppText muted>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>

          <AppButton label="Confirmar" variant="primary" onPress={confirm} disabled={saving} />
          <AppButton
            label="Voltar e corrigir"
            onPress={() =>
              setStep(medicationsToSave.length ? { kind: 'times', index: drafts.length - 1 } : { kind: 'names' })
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  summaryItem: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
