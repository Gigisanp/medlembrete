import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppData } from '@/data/AppDataProvider';
import { formatClock, formatCountdown } from '@/domain/doses';
import { buildHistory, HISTORY_DAYS, type HistoryEntry } from '@/domain/history';
import { useTheme } from '@/theme/ThemeProvider';
import { cardShadow, radius, spacing } from '@/theme/tokens';

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Estado de cada remédio: ícone + texto + cor. "Sem confirmação" não afirma que a pessoa não tomou. */
function EntryStatus({ entry, at, now }: { entry: HistoryEntry; at: Date; now: Date }) {
  if (entry.status === 'tomado' && entry.takenAt) {
    return <StatusBadge tone="success" icon="checkmark-circle" label={`Tomado às ${formatClock(new Date(entry.takenAt))}`} />;
  }
  if (entry.status === 'sem-confirmacao') {
    return <StatusBadge tone="attention" icon="help-circle" label="Sem confirmação" />;
  }
  return <StatusBadge tone="neutral" icon="time-outline" label={formatCountdown(now, at)} />;
}

/** Histórico: registros dos últimos dias, carregados do banco local, organizados por dia. */
export default function HistoryScreen() {
  const { medications, logs } = useAppData();
  const { colors } = useTheme();
  const now = useNow();
  const days = buildHistory({ medications, logs, now });

  return (
    <Screen title="Histórico" settings inTabs>
      {days.length === 0 ? (
        <Card tone="lilac" title="Nenhum horário para mostrar" icon="time-outline">
          <AppText>O histórico aparece depois que você cadastra um remédio com horário.</AppText>
          <AppButton label="Abrir a aba Remédios" icon="medkit-outline" onPress={() => router.navigate('/medicamentos')} />
        </Card>
      ) : (
        <>
          <Card tone="info" icon="information-circle-outline" title="Como ler">
            <AppText color="infoText">
              &quot;Tomado&quot; mostra a hora em que você tocou em &quot;Já tomei&quot;.
            </AppText>
            <AppText color="infoText">
              &quot;Sem confirmação&quot; quer dizer que o registro não foi feito no app. Não quer dizer que o remédio não foi
              tomado.
            </AppText>
          </Card>
          <AppText muted>{`Mostrando os últimos ${HISTORY_DAYS} dias. Os horários seguem o cadastro atual dos remédios.`}</AppText>
        </>
      )}

      {days.map((day) => (
        <View key={day.date} style={styles.day} accessibilityRole="summary">
          <View>
            <AppText size="heading">{day.title}</AppText>
            {day.subtitle ? <AppText muted>{day.subtitle}</AppText> : null}
            {day.past > 0 ? (
              <AppText muted>{`${day.confirmed} de ${day.past} ${day.past === 1 ? 'registro confirmado' : 'registros confirmados'}`}</AppText>
            ) : null}
          </View>
          {day.slots.map((slot) => (
            <View
              key={slot.time}
              style={[styles.slot, cardShadow, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}
            >
              <AppText size="heading" accessibilityLabel={`Horário previsto ${slot.time}`}>
                {slot.time}
              </AppText>
              {slot.entries.map((entry, i) => (
                <View key={`${entry.medicationId ?? entry.name}-${i}`} style={styles.entry}>
                  <AppText bold>{entry.name}</AppText>
                  <EntryStatus entry={entry} at={slot.at} now={now} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { gap: spacing.md },
  slot: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  entry: { gap: spacing.xs },
});
