import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CONTACT_LIMITS, formatPhone, validateContact, type HelpContactErrors, type HelpContactInput } from '@/domain/contact';
import { EXAMPLE_CONTACT_NAME, EXAMPLE_PHONE } from '@/domain/examples';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { TextField } from './TextField';
import { useLeaveGuard } from './useLeaveGuard';

type Props = {
  initial?: HelpContactInput;
  submitLabel: string;
  onSave: (input: HelpContactInput) => Promise<void>;
  onSaved: () => void;
  allowLeave?: boolean;
};

/** Cadastro e edição de contato de ajuda: nome e telefone. Fica só no aparelho. */
export function ContactForm({ initial, submitLabel, onSave, onSaved, allowLeave }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial ? formatPhone(initial.phone) : '');
  const [errors, setErrors] = useState<HelpContactErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const initialPhone = initial ? formatPhone(initial.phone) : '';
  const dirty = name.trim() !== (initial?.name ?? '') || phone.trim() !== initialPhone;
  const guard = useLeaveGuard(dirty && !allowLeave);

  async function handleSubmit() {
    const result = validateContact({ name, phone });
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
      <AppText>Familiar, cuidador ou equipe de saúde. O telefone fica guardado só neste celular.</AppText>
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        placeholder={EXAMPLE_CONTACT_NAME}
        maxLength={CONTACT_LIMITS.name}
        autoCapitalize="words"
        error={errors.name}
      />
      <TextField
        label="Telefone com DDD"
        value={phone}
        onChangeText={setPhone}
        placeholder={EXAMPLE_PHONE}
        keyboardType="phone-pad"
        maxLength={20}
        error={errors.phone}
      />
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
