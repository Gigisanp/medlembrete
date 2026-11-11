import { StyleSheet, View } from 'react-native';

import { EXAMPLE_TIME } from '@/domain/examples';
import { LIMITS } from '@/domain/medication';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { TextField } from './TextField';

type Props = {
  times: string[];
  onChange: (times: string[]) => void;
  /** Erro geral (ex.: nenhum horário). */
  error?: string;
  /** Erros por campo, na mesma ordem. */
  itemErrors?: (string | undefined)[];
};

/** Lista de horários digitados. O app não sugere horários. */
export function TimeInputs({ times, onChange, error, itemErrors }: Props) {
  const { colors } = useTheme();
  const setAt = (index: number, value: string) => onChange(times.map((t, i) => (i === index ? value : t)));
  const removeAt = (index: number) => onChange(times.filter((_, i) => i !== index));

  return (
    <View style={styles.wrapper}>
      <AppText muted>Digite a hora como está na receita. Exemplo: 08:00 ou 8h30.</AppText>
      {times.map((time, index) => (
        <View key={index} style={styles.item}>
          <TextField
            label={`Horário ${index + 1}`}
            value={time}
            onChangeText={(value) => setAt(index, value)}
            placeholder={EXAMPLE_TIME}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            error={itemErrors?.[index]}
          />
          {times.length > 1 ? (
            <AppButton label={`Remover horário ${index + 1}`} icon="trash-outline" onPress={() => removeAt(index)} />
          ) : null}
        </View>
      ))}
      {error ? (
        <View style={[styles.error, { backgroundColor: colors.dangerSurface }]}>
          <AppText bold color="dangerText" accessibilityLiveRegion="polite">
            {`⚠ ${error}`}
          </AppText>
        </View>
      ) : null}
      {times.length < LIMITS.timesPerMedication ? (
        <AppButton label="Adicionar outro horário" icon="add-circle-outline" onPress={() => onChange([...times, ''])} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  item: { gap: spacing.sm },
  error: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
