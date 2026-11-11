import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
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
  const { apagado } = useLocalSearchParams<{ apagado?: string }>();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>({ kind: 'age' });
  const [ageText, setAgeText] = useState('');
  const [ageError, setAgeError] = useState<string>();
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [nameErrors, setNameErrors] = useState<(string | undefined)[]>([]);
  const [timeErrors, setTimeErrors] = useState<MedicationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);

  // Ao refazer pelos Ajustes, sair no meio pergunta antes de descartar as respostas.
  const dirty = ageText.trim() !== '' || drafts.some((d) => d.name.trim() !== '');
  usePreventRemove(dirty && !leaving, ({ repeat }) => {
    Alert.alert('Sair do questionário?', 'As respostas que você digitou serão perdidas.', [
      { text: 'Continuar respondendo', style: 'cancel' },
      {
        text: 'Sair sem salvar',
        style: 'destructive',
        onPress: () => {
          pendingLeave.current = repeat;
          setLeaving(true);
        },
      },
    ]);
  });
  useEffect(() => {
    if (leaving && pendingLeave.current) {
      const go = pendingLeave.current;
      pendingLeave.current = null;
      go();
    }
  }, [leaving]);

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
    setSaveError(false);
    setLeaving(true);
    try {
      await completeOnboarding({ age: age.ok ? age.value : null, medications: medicationsToSave });
    } catch {
      setSaveError(true);
      setLeaving(false);
      setSaving(false);
      return;
    }
    setSaving(false);
    // Primeira abertura: não há tela anterior. Ao refazer pelos Ajustes: volta para Hoje.
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  }

  /** Volta uma pergunta (botão "Voltar" da tela e botão físico do Android). */
  function previousStep(): boolean {
    setTimeErrors({});
    if (step.kind === 'names') setStep({ kind: 'age' });
    else if (step.kind === 'times') setStep(step.index === 0 ? { kind: 'names' } : { kind: 'times', index: step.index - 1 });
    else if (step.kind === 'summary')
      setStep(medicationsToSave.length ? { kind: 'times', index: drafts.length - 1 } : { kind: 'names' });
    else return false;
    return true;
  }
  const previousStepRef = useRef(previousStep);
  useEffect(() => {
    previousStepRef.current = previousStep;
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => previousStepRef.current());
    return () => sub.remove();
  }, []);

  const stepNumber = { age: 1, names: 2, times: 3, summary: 4 }[step.kind];

  return (
    <Screen title="Primeiros passos" back={router.canGoBack()}>
      <View style={styles.progress} accessible accessibilityLabel={`Passo ${stepNumber} de ${TOTAL_STEPS}`}>
        <AppText bold color="onLilac">{`Passo ${stepNumber} de ${TOTAL_STEPS}`}</AppText>
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                { backgroundColor: i < stepNumber ? colors.onLilac : colors.lilacSelected },
              ]}
            />
          ))}
        </View>
      </View>

      {step.kind === 'age' && apagado === '1' ? (
        <Card tone="success" title="Os seus dados foram apagados" icon="checkmark-circle" accessibilityLiveRegion="polite">
          <AppText color="successText">Não há mais remédios, registros, contatos nem avisos neste celular.</AppText>
        </Card>
      ) : null}

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
          <AppButton label="Continuar" variant="primary" icon="arrow-forward" onPress={submitAge} />
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
                  icon="trash-outline"
                  onPress={() => setDrafts((list) => list.filter((_, i) => i !== index))}
                />
              ) : null}
            </View>
          ))}
          <AppButton label="Adicionar outro" icon="add-circle-outline" onPress={() => setDrafts((list) => [...list, emptyDraft()])} />
          <AppButton label="Continuar" variant="primary" icon="arrow-forward" onPress={submitNames} />
          <AppButton label="Pular" onPress={skipNames} />
          <AppButton label="Voltar" icon="arrow-back" onPress={previousStep} />
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
          <AppButton label="Continuar" variant="primary" icon="arrow-forward" onPress={() => submitTimes(step.index)} />
          <AppButton label="Pular" onPress={() => skipTimes(step.index)} />
          <AppButton label="Voltar" icon="arrow-back" onPress={previousStep} />
        </>
      ) : null}

      {step.kind === 'summary' ? (
        <>
          <AppText size="title">Confira os dados</AppText>
          <Card tone="lilac">
            <AppText bold>Estes são os horários que a sua receita indicou. Confira com atenção.</AppText>
          </Card>

          {age.ok && age.value != null ? <AppText>{`Idade: ${age.value} anos`}</AppText> : null}

          {medicationsToSave.length === 0 ? (
            <AppText>Nenhum medicamento informado. Você pode cadastrar depois, na aba Remédios.</AppText>
          ) : (
            medicationsToSave.map((med, index) => (
              <Card key={index}>
                <AppText size="heading">{med.name}</AppText>
                <AppText>
                  {med.times.length ? `Horários: ${med.times.join(', ')}` : 'Sem horário. Você pode adicionar depois, na aba Remédios.'}
                </AppText>
                {med.note ? <AppText muted>{`Observação: ${med.note}`}</AppText> : null}
              </Card>
            ))
          )}

          <AppText muted>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>

          {saveError ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSurface }]}>
              <AppText bold color="dangerText" accessibilityLiveRegion="polite">
                ⚠ Não foi possível salvar. As respostas continuam aqui. Tente de novo.
              </AppText>
            </View>
          ) : null}

          <AppButton
            label="Confirmar"
            variant="primary"
            icon="checkmark"
            onPress={confirm}
            loading={saving}
            loadingLabel="Salvando…"
          />
          <AppButton label="Voltar e corrigir" icon="arrow-back" onPress={previousStep} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  progress: { gap: spacing.sm },
  progressBar: { flexDirection: 'row', gap: spacing.xs },
  progressSegment: { flex: 1, height: 8, borderRadius: radius.pill },
  error: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
