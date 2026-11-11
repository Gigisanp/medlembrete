import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { countLabel, formatClock, slotDate, withStatus } from '@/domain/doses';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type Params = {
  date?: string;
  time?: string;
  /** "saved" quando veio de "Já tomei"; "snoozed" quando veio de "Ainda não". */
  result?: string;
  until?: string;
  test?: string;
};

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

function ErrorMessage({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.dangerSurface }]}>
      <AppText bold color="dangerText" accessibilityLiveRegion="polite">{`⚠ ${text}`}</AppText>
    </View>
  );
}

/**
 * Registro: "Você tomou?", com "Sim, tomei" e "Ainda não".
 * "Já tomei" registra todos os remédios do horário de uma vez; com mais de um,
 * a tela mostra a lista e pergunta claramente antes de salvar.
 */
export default function RecordScreen() {
  const params = useLocalSearchParams<Params>();
  const { medications, logs, settings, confirmDose, snoozeDose } = useAppData();
  const [result, setResult] = useState(params.result ?? '');
  const [until, setUntil] = useState(params.until ?? '');
  const [busy, setBusy] = useState<'' | 'confirm' | 'snooze'>('');
  const [error, setError] = useState('');
  const canGoBack = router.canGoBack();

  if (params.test === '1') {
    return (
      <Screen title="Aviso de teste" back={canGoBack}>
        <Card tone="info" title="Este foi só um teste" icon="information-circle-outline">
          <AppText color="infoText">Nada foi registrado.</AppText>
          {result === 'saved' ? (
            <AppText color="infoText">Você tocou em &quot;Já tomei&quot;. A repetição do teste foi cancelada.</AppText>
          ) : null}
          {result === 'snoozed' ? (
            <AppText color="infoText">Você tocou em &quot;Ainda não&quot;. O teste vai repetir em 1 minuto.</AppText>
          ) : null}
        </Card>
        <AppButton label="Voltar para Hoje" variant="primary" icon="today-outline" onPress={goHome} />
      </Screen>
    );
  }

  const { date, time } = params;
  const slotMeds = medications.filter((m) => time && m.times.includes(time)).map((m) => ({ id: m.id, name: m.name }));

  if (!date || !time || slotMeds.length === 0) {
    return (
      <Screen title="Registro" back={canGoBack}>
        <Card tone="info" title="Horário não encontrado" icon="information-circle-outline">
          <AppText color="infoText">Este horário não está mais cadastrado.</AppText>
        </Card>
        <AppButton label="Voltar para Hoje" variant="primary" icon="today-outline" onPress={goHome} />
      </Screen>
    );
  }

  const slot = withStatus({ date, time, at: slotDate(date, time), medications: slotMeds }, logs, new Date());
  const many = slotMeds.length > 1;
  const names = (
    <View style={styles.names}>
      {slotMeds.map((m) => (
        <AppText key={m.id} bold>
          {m.name}
        </AppText>
      ))}
    </View>
  );

  if (slot.status === 'tomado' || result === 'saved') {
    return (
      <Screen title="Registro" back={canGoBack}>
        <Card tone="success" title="✓ Registro salvo com sucesso" icon="checkmark-circle" accessibilityLiveRegion="polite">
          <AppText color="successText">{`Horário previsto: ${time}`}</AppText>
          {slot.takenAt ? (
            <AppText color="successText" bold>{`Registrado às ${formatClock(new Date(slot.takenAt))}`}</AppText>
          ) : null}
          <AppText color="successText">{many ? `Remédios registrados (${slotMeds.length}):` : 'Remédio registrado:'}</AppText>
          {names}
        </Card>
        <AppButton label="Voltar para Hoje" variant="primary" icon="today-outline" onPress={goHome} />
      </Screen>
    );
  }

  if (result === 'snoozed') {
    return (
      <Screen title="Registro" back={canGoBack}>
        <Card tone="lilac" title="Tudo bem" icon="alarm-outline" accessibilityLiveRegion="polite">
          <AppText>{`Vamos avisar de novo às ${until}, daqui a ${settings.repeatMinutes} minutos.`}</AppText>
        </Card>
        <AppText muted>
          Se esqueceu um horário, não tome dose extra. Em caso de dúvida, fale com o seu médico ou farmacêutico.
        </AppText>
        <AppButton label="Voltar para Hoje" variant="primary" icon="today-outline" onPress={goHome} />
      </Screen>
    );
  }

  async function confirm() {
    setBusy('confirm');
    setError('');
    try {
      await confirmDose(date!, time!);
      setResult('saved');
    } catch {
      setError('Não foi possível salvar o registro. Tente de novo.');
    } finally {
      setBusy('');
    }
  }

  async function snooze() {
    setBusy('snooze');
    setError('');
    try {
      const next = await snoozeDose(date!, time!);
      setUntil(formatClock(next));
      setResult('snoozed');
    } catch {
      setError('Não foi possível marcar o novo aviso. Tente de novo.');
    } finally {
      setBusy('');
    }
  }

  return (
    <Screen title="Registro" back={canGoBack}>
      <AppText size="title">{many ? `Você tomou estes ${slotMeds.length} remédios?` : 'Você tomou?'}</AppText>
      <Card>
        <AppText size="heading">{`Horário das ${time}`}</AppText>
        {names}
      </Card>
      {many ? (
        <AppText>{`Ao tocar em "Sim", ${countLabel(slotMeds.length)} deste horário serão registrados juntos.`}</AppText>
      ) : null}
      {error ? <ErrorMessage text={error} /> : null}
      <AppButton
        label={many ? `Sim, tomei ${countLabel(slotMeds.length)}` : 'Sim, tomei'}
        variant="primary"
        icon="checkmark"
        loading={busy === 'confirm'}
        loadingLabel="Salvando…"
        disabled={busy !== ''}
        onPress={confirm}
      />
      <AppButton label="Ainda não" icon="alarm-outline" disabled={busy !== ''} onPress={snooze} />
      <AppText muted>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  names: { gap: spacing.xs },
  error: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
