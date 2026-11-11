import { contrastRatio } from '@/theme/contrast';
import {
  baseFontSizes,
  colors,
  fontScales,
  initialFontSizeForAge,
  MIN_BASE_FONT_SIZE,
  nonTextColorPairs,
  textColorPairs,
} from '@/theme/tokens';

describe('contraste', () => {
  it.each(textColorPairs)('%s sobre %s tem pelo menos 4,5:1', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(nonTextColorPairs)('limite/ícone %s sobre %s tem pelo menos 3:1', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
  });

  it('calcula o caso extremo preto sobre branco (21:1)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
});

describe('tamanhos de fonte', () => {
  it('nenhum texto fica abaixo de 20 px na escala normal', () => {
    Object.values(baseFontSizes).forEach((size) => {
      expect(size).toBeGreaterThanOrEqual(MIN_BASE_FONT_SIZE);
    });
  });

  it('as escalas só aumentam a letra', () => {
    Object.values(fontScales).forEach((scale) => expect(scale).toBeGreaterThanOrEqual(1));
  });
});

describe('initialFontSizeForAge', () => {
  it('60 anos ou mais começa com letra grande', () => {
    expect(initialFontSizeForAge(60)).toBe('grande');
    expect(initialFontSizeForAge(85)).toBe('grande');
  });

  it('menos de 60 ou idade pulada começa no normal', () => {
    expect(initialFontSizeForAge(59)).toBe('normal');
    expect(initialFontSizeForAge(undefined)).toBe('normal');
    expect(initialFontSizeForAge(null)).toBe('normal');
  });
});
