import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { formatClock, slotDate, withStatus } from '@/domain/doses';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

type Params = {
  date?: string;
  time?: string;
  /** "saved" quando veio do botão "Já tomei"; "snoozed" quando veio de "Ainda não". */
  result?: string;
  until?: string;
  test?: string;
};

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

/** Registro: "Você tomou?", com "Sim, tomei" e "Ainda não". */
export default function RecordScreen() {
  const params = useLocalSearchParams<Params>();
  const { medications, logs, settings, confirmDose, snoozeDose } = useAppData();
  const { colors } = useTheme();
  const [result, setResult] = useState(params.result ?? '');
  const [until, setUntil] = useState(params.until ?? '');
  const [busy, setBusy] = useState(false);

  if (params.test === '1') {
    return (
      <Screen>
        <AppText size="title">Aviso de teste</AppText>
        <AppText>Este foi só um teste. Nada foi registrado.</AppText>
        {result === 'saved' ? <AppText>Você tocou em "Já tomei". A repetição do teste foi cancelada.</AppText> : null}
        {result === 'snoozed' ? <AppText>Você tocou em "Ainda não". O teste vai repetir em 1 minuto.</AppText> : null}
        <AppButton label="Voltar para Hoje" variant="primary" onPress={goHome} />
      </Screen>
    );
  }

  const { date, time } = params;
  const slotMeds = medications.filter((m) => time && m.times.includes(time)).map((m) => ({ id: m.id, name: m.name }));

  if (!date || !time || slotMeds.length === 0) {
    return (
      <Screen>
        <AppText>Este horário não está mais cadastrado.</AppText>
        <AppButton label="Voltar para Hoje" variant="primary" onPress={goHome} />
      </Screen>
    );
  }

  const slot = withStatus({ date, time, at: slotDate(date, time), medications: slotMeds }, logs, new Date());
  const names = slotMeds.map((m) => m.name).join(', ');

  if (slot.status === 'tomado' || result === 'saved') {
    return (
      <Screen>
        <View style={[styles.box, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
          <AppText size="title" accessibilityLiveRegion="polite">✓ Registro salvo com sucesso</AppText>
          <AppText>{`Horário das ${time}: ${names}.`}</AppText>
          {slot.takenAt ? <AppText>{`Confirmado às ${formatClock(new Date(slot.takenAt))}.`}</AppText> : null}
        </View>
        <AppButton label="Voltar para Hoje" variant="primary" onPress={goHome} />
      </Screen>
    );
  }

  if (result === 'snoozed') {
    return (
      <Screen>
        <AppText size="title" accessibilityLiveRegion="polite">Tudo bem</AppText>
        <AppText>{`Vamos avisar de novo às ${until}, daqui a ${settings.repeatMinutes} minutos.`}</AppText>
        <AppText muted>Se esqueceu um horário, não tome dose extra. Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>
        <AppButton label="Voltar para Hoje" variant="primary" onPress={goHome} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText size="title">Você tomou?</AppText>
      <AppText size="heading">{`Horário das ${time}`}</AppText>
      <AppText>{names}</AppText>
      <AppButton
        label="Sim, tomei"
        variant="primary"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await confirmDose(date, time);
          setResult('saved');
          setBusy(false);
        }}
      />
      <AppButton
        label="Ainda não"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          const next = await snoozeDose(date, time);
          setUntil(formatClock(next));
          setResult('snoozed');
          setBusy(false);
        }}
      />
      <AppText muted>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
