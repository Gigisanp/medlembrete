/**
 * Tokens de acessibilidade do MedLembrete.
 *
 * Regras (ver CLAUDE.md):
 * - Texto base de 20 px ou mais, com opção de aumentar.
 * - Contraste de texto de pelo menos 4,5:1 (verificado em __tests__/contrast-test.ts).
 * - Área de toque de pelo menos 44 px.
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F1F3F6',
  text: '#1A1A1A',
  textMuted: '#454545',
  border: '#454545',

  primary: '#0B4F8A',
  primaryPressed: '#083A66',
  onPrimary: '#FFFFFF',

  secondaryPressed: '#DCE3EC',

  danger: '#9E1C1C',
  onDanger: '#FFFFFF',

  focus: '#B35900',
} as const;

export type ColorName = keyof typeof colors;

/** Pares texto/fundo usados no app. Todos precisam de contraste >= 4,5:1. */
export const textColorPairs: ReadonlyArray<[ColorName, ColorName]> = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'secondaryPressed'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onDanger', 'danger'],
  ['danger', 'background'],
];

/** Tamanho mínimo de área de toque exigido pelo projeto. */
export const MIN_TOUCH_SIZE = 44;

/** Altura dos botões: acima do mínimo, para facilitar o toque. */
export const BUTTON_HEIGHT = 60;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 12,
} as const;

/** Tamanhos de fonte na escala "normal". Nenhum texto fica abaixo de 20 px. */
export const baseFontSizes = {
  body: 20,
  label: 20,
  heading: 24,
  title: 30,
  display: 36,
} as const;

export type FontRole = keyof typeof baseFontSizes;

export const FONT_SIZE_OPTIONS = ['normal', 'grande', 'muitoGrande'] as const;
export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number];

export const fontScales: Record<FontSizeOption, number> = {
  normal: 1,
  grande: 1.25,
  muitoGrande: 1.5,
};

export const fontSizeLabels: Record<FontSizeOption, string> = {
  normal: 'Normal',
  grande: 'Grande',
  muitoGrande: 'Muito grande',
};

export const MIN_BASE_FONT_SIZE = 20;

/**
 * Tamanho inicial da letra a partir da idade informada no questionário.
 * Quem tem 60 anos ou mais começa com letra grande. Sem idade, começa no normal.
 */
export function initialFontSizeForAge(age?: number | null): FontSizeOption {
  if (age == null || !Number.isFinite(age)) return 'normal';
  return age >= 60 ? 'grande' : 'normal';
}
