import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import {
  firstSlotTomorrow,
  formatClock,
  formatCountdown,
  highlightedSlot,
  todaySlots,
  type SlotWithStatus,
} from '@/domain/doses';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

/** Atualiza o "agora" a cada 30 segundos, para o destaque e a contagem ficarem certos. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function statusText(slot: SlotWithStatus): string {
  if (slot.status === 'tomado' && slot.takenAt) return `✓ Tomado às ${formatClock(new Date(slot.takenAt))}`;
  if (slot.status === 'pendente') return '⏰ Pendente';
  return 'Ainda não chegou a hora';
}

/**
 * Aba Hoje: próximo lembrete em destaque, botão "Já tomei" e horários do dia.
 * A lista completa de medicamentos fica na aba Remédios.
 */
export default function HomeScreen() {
  const { settings, medications, logs, permission, confirmDose } = useAppData();
  const { colors } = useTheme();
  const now = useNow();
  const [saving, setSaving] = useState(false);

  if (!settings.onboardingDone) return <Redirect href="/questionario" />;
  if (!settings.notificationsAsked) return <Redirect href="/permissao" />;

  const today = todaySlots(medications, logs, now);
  const highlight = highlightedSlot(medications, logs, now);
  const tomorrow = highlight ? null : firstSlotTomorrow(medications, now);
  const allDoneToday = today.length > 0 && today.every((s) => s.status === 'tomado');
  const withoutTime = medications.filter((m) => m.times.length === 0).length;

  return (
    <Screen>
      {medications.length > 0 && permission.state !== 'granted' ? (
        <View style={[styles.box, { borderColor: colors.danger }]}>
          <AppText bold>⚠ Os avisos estão desligados.</AppText>
          <AppText>Sem eles, o app não consegue lembrar você na hora dos remédios.</AppText>
          <AppButton label="Ligar avisos" onPress={() => router.push('/permissao')} />
        </View>
      ) : null}

      {medications.length === 0 ? <AppText>Você ainda não tem medicamentos cadastrados.</AppText> : null}

      {highlight ? (
        <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <AppText bold>
            {highlight.status === 'pendente' ? '⏰ Hora do remédio' : 'Próximo lembrete'}
          </AppText>
          <AppText size="display">{highlight.time}</AppText>
          <AppText size="heading">{highlight.medications.map((m) => m.name).join(', ')}</AppText>
          <AppText>
            {highlight.status === 'pendente'
              ? 'Ainda não confirmado.'
              : `Começa ${formatCountdown(now, highlight.at)}.`}
          </AppText>
        </View>
      ) : null}

      {!highlight && tomorrow ? (
        <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          {allDoneToday ? <AppText bold>✓ Todos os horários de hoje foram confirmados.</AppText> : null}
          <AppText bold>Próximo lembrete (amanhã)</AppText>
          <AppText size="display">{tomorrow.time}</AppText>
          <AppText size="heading">{tomorrow.medications.map((m) => m.name).join(', ')}</AppText>
        </View>
      ) : null}

      {highlight ? (
        <AppButton
          label="Já tomei"
          variant="primary"
          disabled={saving}
          accessibilityHint={`Registra o horário das ${highlight.time}`}
          onPress={async () => {
            setSaving(true);
            await confirmDose(highlight.date, highlight.time);
            setSaving(false);
            router.push({
              pathname: '/registro',
              params: { date: highlight.date, time: highlight.time, result: 'saved' },
            });
          }}
        />
      ) : null}

      {today.length > 0 ? (
        <View style={styles.section}>
          <AppText size="heading">Horários de hoje</AppText>
          {today.map((slot) => (
            <View key={slot.time} style={[styles.row, { borderColor: colors.border }]}>
              <AppText bold>{`${slot.time} — ${slot.medications.map((m) => m.name).join(', ')}`}</AppText>
              <AppText muted={slot.status === 'agendado'}>{statusText(slot)}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      {withoutTime > 0 ? (
        <View style={[styles.row, { borderColor: colors.border }]}>
          <AppText>
            {withoutTime === 1
              ? '1 medicamento está sem horário e não gera aviso.'
              : `${withoutTime} medicamentos estão sem horário e não geram aviso.`}
          </AppText>
          <AppButton label="Abrir a aba Remédios" onPress={() => router.push('/medicamentos')} />
        </View>
      ) : null}

      {medications.length === 0 ? (
        <AppButton
          label="Cadastrar medicamento"
          variant="primary"
          onPress={() => router.push('/medicamentos/novo')}
        />
      ) : null}
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
  section: { gap: spacing.md },
  row: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
