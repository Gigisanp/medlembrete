import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppData } from '@/data/AppDataProvider';
import {
  countLabel,
  firstSlotTomorrow,
  formatClock,
  formatCountdown,
  formatLongDate,
  highlightedSlot,
  todaySlots,
  type SlotWithStatus,
} from '@/domain/doses';
import { useTheme } from '@/theme/ThemeProvider';
import { cardShadow, radius, spacing } from '@/theme/tokens';

/** Atualiza o "agora" a cada 30 segundos, para o destaque e a contagem ficarem certos. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Estado de um horário: sempre ícone + texto + cor. Horário futuro tem aparência neutra. */
function SlotStatus({ slot, now }: { slot: SlotWithStatus; now: Date }) {
  if (slot.status === 'tomado' && slot.takenAt) {
    return <StatusBadge tone="success" icon="checkmark-circle" label={`Tomado às ${formatClock(new Date(slot.takenAt))}`} />;
  }
  if (slot.status === 'pendente') {
    return <StatusBadge tone="attention" icon="alert-circle" label="Ainda não confirmado" />;
  }
  return <StatusBadge tone="neutral" icon="time-outline" label={formatCountdown(now, slot.at)} />;
}

/** Nomes dos remédios, um por linha. */
function MedicationNames({ slot, size = 'heading' }: { slot: { medications: { id: number; name: string }[] }; size?: 'heading' | 'body' }) {
  return (
    <View style={styles.names}>
      {slot.medications.map((m) => (
        <AppText key={m.id} size={size} bold>
          {m.name}
        </AppText>
      ))}
    </View>
  );
}

/**
 * Aba Hoje: data, cartão do horário em destaque com a ação junto, e os demais horários do dia.
 * A lista completa de remédios fica na aba Remédios.
 */
export default function HomeScreen() {
  const { settings, medications, logs, permission, confirmDose } = useAppData();
  const { colors } = useTheme();
  const now = useNow();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  if (!settings.onboardingDone) return <Redirect href="/questionario" />;
  if (!settings.notificationsAsked) return <Redirect href="/permissao" />;

  const today = todaySlots(medications, logs, now);
  const highlight = highlightedSlot(medications, logs, now);
  const others = today.filter((s) => s.time !== highlight?.time);
  const allDoneToday = today.length > 0 && today.every((s) => s.status === 'tomado');
  const tomorrow = allDoneToday ? firstSlotTomorrow(medications, now) : null;
  const withoutTime = medications.filter((m) => m.times.length === 0).length;

  async function confirmHighlight() {
    if (!highlight) return;
    // Com mais de um remédio no horário, abre a pergunta com a lista antes de salvar.
    if (highlight.medications.length > 1) {
      router.push({ pathname: '/registro', params: { date: highlight.date, time: highlight.time } });
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      await confirmDose(highlight.date, highlight.time);
      router.push({ pathname: '/registro', params: { date: highlight.date, time: highlight.time, result: 'saved' } });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Hoje" settings inTabs>
      <AppText muted>{formatLongDate(now)}</AppText>

      {medications.length > 0 && permission.state !== 'granted' ? (
        <Card tone="attention" title="Os avisos estão desligados" icon="notifications-off-outline">
          <AppText color="attentionText">Sem eles, o app não consegue lembrar você na hora dos remédios.</AppText>
          <AppButton label="Ligar avisos" icon="notifications-outline" onPress={() => router.push('/permissao')} />
        </Card>
      ) : null}

      {medications.length === 0 ? (
        <Card tone="lilac" title="Nenhum remédio cadastrado" icon="medkit-outline">
          <AppText>Cadastre o nome e os horários que a sua receita indicou.</AppText>
          <AppButton
            label="Cadastrar medicamento"
            variant="primary"
            icon="add-circle-outline"
            onPress={() => router.push('/medicamentos/novo')}
          />
        </Card>
      ) : null}

      {highlight ? (
        <View
          style={[
            styles.mainCard,
            highlight.status === 'pendente'
              ? { backgroundColor: colors.attentionSurface, borderColor: colors.attentionSurface }
              : [cardShadow, { backgroundColor: colors.card, borderColor: colors.borderSoft }],
          ]}
        >
          {highlight.status === 'pendente' ? (
            <StatusBadge tone="attention" icon="alert-circle" label="Ainda não confirmado" />
          ) : (
            <StatusBadge tone="lilac" icon="time-outline" label="Próximo horário" />
          )}
          <AppText size="display" accessibilityLabel={`Horário das ${highlight.time}`}>
            {highlight.time}
          </AppText>
          <MedicationNames slot={highlight} />
          {highlight.medications.length > 1 ? (
            <AppText muted>{`${highlight.medications.length} remédios neste horário.`}</AppText>
          ) : null}
          <AppText color={highlight.status === 'pendente' ? 'attentionText' : 'textMuted'}>
            {highlight.status === 'pendente' ? 'O horário já passou.' : formatCountdown(now, highlight.at)}
          </AppText>

          {saveError ? (
            <View style={[styles.inlineError, { backgroundColor: colors.dangerSurface }]}>
              <AppText bold color="dangerText" accessibilityLiveRegion="polite">
                ⚠ Não foi possível salvar o registro. Tente de novo.
              </AppText>
            </View>
          ) : null}

          <AppButton
            label={highlight.medications.length > 1 ? `Já tomei ${countLabel(highlight.medications.length)}` : 'Já tomei'}
            variant="primary"
            icon="checkmark"
            loading={saving}
            loadingLabel="Salvando…"
            accessibilityHint={
              highlight.medications.length > 1
                ? `Abre a confirmação dos ${highlight.medications.length} remédios das ${highlight.time}`
                : `Registra ${highlight.medications[0].name} das ${highlight.time}`
            }
            onPress={confirmHighlight}
          />
        </View>
      ) : null}

      {allDoneToday ? (
        <Card tone="success" title="Todos os horários de hoje foram confirmados" icon="checkmark-circle">
          {tomorrow ? (
            <AppText color="successText">
              {`Próximo horário: amanhã às ${tomorrow.time} — ${tomorrow.medications.map((m) => m.name).join(', ')}.`}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      {others.length > 0 ? (
        <View style={styles.section}>
          <AppText size="heading">{highlight ? 'Outros horários de hoje' : 'Horários de hoje'}</AppText>
          {others.map((slot) => (
            <View key={slot.time} style={[styles.row, cardShadow, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}>
              <AppText size="heading">{slot.time}</AppText>
              <MedicationNames slot={slot} size="body" />
              <SlotStatus slot={slot} now={now} />
            </View>
          ))}
        </View>
      ) : null}

      {withoutTime > 0 ? (
        <Card tone="info" title="Remédio sem horário" icon="information-circle-outline">
          <AppText color="infoText">
            {withoutTime === 1
              ? '1 medicamento está sem horário e não gera aviso.'
              : `${withoutTime} medicamentos estão sem horário e não geram aviso.`}
          </AppText>
          <AppButton label="Abrir a aba Remédios" icon="medkit-outline" onPress={() => router.push('/medicamentos')} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  names: { gap: spacing.xs },
  section: { gap: spacing.md },
  row: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inlineError: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
