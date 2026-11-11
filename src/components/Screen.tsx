import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { CONTENT_MAX_WIDTH, spacing } from '@/theme/tokens';

import { AppHeader } from './AppHeader';

type Props = {
  title: string;
  /** "Voltar" no cabeçalho. */
  back?: boolean;
  /** Botão "Ajustes" no cabeçalho (nas telas principais das abas). */
  settings?: boolean;
  /** Tela dentro das abas: a barra de abas já cuida da área segura de baixo. */
  inTabs?: boolean;
  children: ReactNode;
};

/**
 * Contêiner padrão das telas:
 * - cabeçalho do app com título que quebra linha;
 * - respeita notch, barras do sistema e áreas seguras (inclusive em paisagem);
 * - rola quando a letra cresce, e o teclado não cobre o campo ativo nem o botão de salvar;
 * - em telas largas, limita a largura do conteúdo e centraliza.
 */
export function Screen({ title, back, settings, inTabs, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();

  // Em janelas baixas (paisagem) ou com fonte muito ampliada, o cabeçalho rola junto
  // com o conteúdo, para não ocupar a tela inteira.
  const headerScrolls = height < 520 || fontScale >= 1.6;
  const header = <AppHeader title={title} back={back} settings={settings} topInset={insets.top} />;

  return (
    <KeyboardAvoidingView
      // Recomendado pela documentação do Expo: "padding" nas duas plataformas
      // (no Android o app ocupa a tela toda e a janela não encolhe sozinha com o teclado).
      behavior="padding"
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {headerScrolls ? null : header}
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: Math.max(insets.left, spacing.lg),
            paddingRight: Math.max(insets.right, spacing.lg),
            paddingBottom: (inTabs ? 0 : insets.bottom) + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {headerScrolls ? <View style={styles.scrollingHeader}>{header}</View> : null}
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: spacing.lg,
    flexGrow: 1,
  },
  scrollingHeader: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.lg,
  },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.lg,
  },
});
