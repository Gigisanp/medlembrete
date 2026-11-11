/**
 * Tokens de design do MedLembrete.
 *
 * Regras (ver CLAUDE.md):
 * - Texto base de 20 px ou mais, com opção de aumentar e com a ampliação do sistema liberada.
 * - Contraste de texto de pelo menos 4,5:1 e de limites de controles de pelo menos 3:1
 *   (verificado em __tests__/theme-test.tsx).
 * - Área de toque de pelo menos 44 px.
 * - Nenhum estado comunicado só por cor: sempre texto e ícone junto.
 *
 * Identidade: lilás suave nos fundos; textos e limites escuros para leitura.
 */

export const colors = {
  // Base
  background: '#FAF9FD',
  card: '#FFFFFF',
  text: '#292637',
  textMuted: '#5E586B',
  /** Borda decorativa (separadores, contorno leve de cartões). Não serve para identificar controles. */
  borderSoft: '#E3DFEB',
  /** Limite de campos e botões secundários (contraste ≥ 3:1 com o fundo). */
  borderControl: '#7B7290',

  // Identidade (lilás): navegação, ações gerais e seleção
  lilacSurface: '#F0EBFA',
  lilacSelected: '#E2D7F5',
  onLilac: '#503780',
  lilacPressed: '#D3C3EF',

  // Registro confirmado ("Tomado" = registro confirmado, não avaliação clínica)
  successSurface: '#E5F3E8',
  successText: '#1D5530',
  successIcon: '#2B7340',

  // Horário passado sem confirmação, ou algo que exige atenção
  attentionSurface: '#FFF3D6',
  attentionText: '#5A3B00',
  attentionIcon: '#8A5700',

  // Informações e contato de ajuda
  infoSurface: '#E6EFFA',
  infoText: '#1C3D6E',
  infoIcon: '#2A5A9E',

  // Erros relevantes, emergência e exclusão (sempre com rótulo explícito)
  dangerSurface: '#FCEBEB',
  dangerText: '#8A1C1C',
  danger: '#A32020',

  // Desabilitado
  disabledSurface: '#EEECF2',
  disabledText: '#6B6577',

  /** Cor da sombra discreta dos cartões. */
  shadow: '#292637',
} as const;

export type ColorName = keyof typeof colors;

/** Pares texto/fundo realmente usados no app. Todos precisam de contraste ≥ 4,5:1. */
export const textColorPairs: readonly [ColorName, ColorName][] = [
  ['text', 'background'],
  ['text', 'card'],
  ['text', 'lilacSurface'],
  ['text', 'lilacSelected'],
  ['text', 'successSurface'],
  ['text', 'attentionSurface'],
  ['text', 'infoSurface'],
  ['text', 'dangerSurface'],
  ['textMuted', 'background'],
  ['textMuted', 'card'],
  ['textMuted', 'lilacSurface'],
  ['onLilac', 'background'],
  ['onLilac', 'card'],
  ['onLilac', 'lilacSurface'],
  ['onLilac', 'lilacSelected'],
  ['onLilac', 'lilacPressed'],
  ['successText', 'successSurface'],
  ['successText', 'card'],
  ['attentionText', 'attentionSurface'],
  ['infoText', 'infoSurface'],
  ['dangerText', 'dangerSurface'],
  ['danger', 'background'],
  ['danger', 'card'],
  ['danger', 'dangerSurface'],
  ['disabledText', 'disabledSurface'],
];

/**
 * Pares de limite de controle e ícone de estado sobre o fundo onde aparecem.
 * Precisam de contraste ≥ 3:1 (WCAG 1.4.11, componentes de interface).
 */
export const nonTextColorPairs: readonly [ColorName, ColorName][] = [
  ['borderControl', 'background'],
  ['borderControl', 'card'],
  ['onLilac', 'background'],
  ['onLilac', 'card'],
  ['onLilac', 'lilacSelected'],
  ['danger', 'card'],
  ['danger', 'dangerSurface'],
  ['successIcon', 'successSurface'],
  ['successIcon', 'card'],
  ['attentionIcon', 'attentionSurface'],
  ['attentionIcon', 'card'],
  ['infoIcon', 'infoSurface'],
  ['textMuted', 'card'],
];

/** Tons semânticos usados em cartões e etiquetas de estado. */
export type Tone = 'neutral' | 'lilac' | 'success' | 'attention' | 'info' | 'danger';

export const toneColors: Record<Tone, { surface: ColorName; text: ColorName; icon: ColorName }> = {
  neutral: { surface: 'card', text: 'text', icon: 'textMuted' },
  lilac: { surface: 'lilacSurface', text: 'onLilac', icon: 'onLilac' },
  success: { surface: 'successSurface', text: 'successText', icon: 'successIcon' },
  attention: { surface: 'attentionSurface', text: 'attentionText', icon: 'attentionIcon' },
  info: { surface: 'infoSurface', text: 'infoText', icon: 'infoIcon' },
  danger: { surface: 'dangerSurface', text: 'dangerText', icon: 'danger' },
};

/** Tamanho mínimo de área de toque exigido pelo projeto. */
export const MIN_TOUCH_SIZE = 44;

/** Altura mínima dos botões. Cresce se o texto ocupar mais linhas. */
export const BUTTON_HEIGHT = 60;

/** Largura máxima do conteúdo em telas largas (tablets, dobráveis abertos, paisagem). */
export const CONTENT_MAX_WIDTH = 640;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

/** Sombra discreta para cartões. */
export const cardShadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

/** Tamanhos de fonte na escala "normal". Nenhum texto fica abaixo de 20 px. */
export const baseFontSizes = {
  body: 20,
  label: 20,
  heading: 24,
  title: 30,
  display: 40,
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
