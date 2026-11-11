import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  baseFontSizes,
  colors,
  fontScales,
  type FontRole,
  type FontSizeOption,
} from './tokens';

type Theme = {
  colors: typeof colors;
  fontSize: FontSizeOption;
  setFontSize: (option: FontSizeOption) => void;
  /** Tamanho em px já ajustado pela escala escolhida pela pessoa. */
  font: Record<FontRole, number>;
};

const ThemeContext = createContext<Theme | null>(null);

type Props = {
  children: ReactNode;
  /** Valor inicial quando o tema controla o próprio estado. */
  initialFontSize?: FontSizeOption;
  /** Modo controlado: o tamanho vem de fora (do banco local). */
  fontSize?: FontSizeOption;
  onFontSizeChange?: (option: FontSizeOption) => void;
};

/**
 * Fornece cores e tamanhos de letra. No app, o tamanho vem do banco local
 * (modo controlado); nos testes de componente, pode guardar o próprio estado.
 */
export function ThemeProvider({ children, initialFontSize = 'normal', fontSize, onFontSizeChange }: Props) {
  const [internal, setInternal] = useState<FontSizeOption>(initialFontSize);
  const current = fontSize ?? internal;
  const setFontSize = onFontSizeChange ?? setInternal;

  const value = useMemo<Theme>(() => {
    const scale = fontScales[current];
    const font = Object.fromEntries(
      Object.entries(baseFontSizes).map(([role, size]) => [role, Math.round(size * scale)]),
    ) as Record<FontRole, number>;
    return { colors, fontSize: current, setFontSize, font };
  }, [current, setFontSize]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return theme;
}
