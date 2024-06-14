export const brandColors = ['brand', 'brandBg'] as const;

export type BrandColors = typeof brandColors;

export const additionalColors = [
    'additionalPink',
    'additionalPurple',
    'additionalDeepPurple',
    'additionalIndigo',
    'additionalLightBlue',
    'additionalCyan',
    'additionalTeal',
    'additionalLightGreen',
    'additionalLime',
    'additionalAmber',
    'additionalOrange',
    'additionalDeepOrange',
] as const;

export type AdditionalColors = typeof additionalColors;

export const attentionColors = [
    'attentionErrorRed',
    'attentionWarningYellow',
    'attentionInfoBlue',
    'attentionSuccessGreen',
] as const;

export type AttentionColors = typeof attentionColors;

export const contrastColors = [
    'contrastBlue',
    'contrastYellow',
    'contrastOrange',
    'contrastGreen',
    'contrastDeepPurple',
    'contrastPink',
    'contrastCyan',
    'contrastPurple',
] as const;

export type ContrastColors = typeof contrastColors;

export const themeColors = [
    ...brandColors,
    ...additionalColors,
    ...attentionColors,
    ...contrastColors,
] as const;

export type GeneratedHandler = (
    theme: ThemeDefinition,
    colorVariable: CssColorVariables,
    options: ThemeOptions,
) => [Hue, Percentage, Percentage];

export type Initial = 'initial';

export type ConfigurableThemeColors = (typeof themeColors)[number];

export const generatedThemeColors = ['core'] as const;
export type GeneratedThemeColors = (typeof generatedThemeColors)[number];

/**
 * Theme Base Colors
 */
export type ThemeColors = (typeof themeColors)[number] | GeneratedThemeColors;

/**
 * Shade offset keys
 */
export type Shades = `${'dark' | 'light'}${IntRange<1, 19>}` | Initial;

/**
 * Shade offset values
 */
export type ShadeValues = IntRange<0, 101> | Initial;

export const initialShade = { key: 'initial', value: 'initial' } as const;

export type ShadeDefinition =
    | {
          key: Shades;
          value: ShadeValues;
      }
    | typeof initialShade;

export type ShadeDefinitions = ShadeDefinition[];

export const generateShades = (every = 1): ShadeDefinitions => {
    const step = (100 / 38) * every;
    const generate = (type: 'dark' | 'light'): ShadeDefinitions =>
        Array(18)
            .fill(0)
            .map((_, index) => {
                const current = index + 1;
                const offset = Math.floor(current / every) * step;
                const value = (type === 'light' ? 0 + offset : 100 - offset) as ShadeValues;
                return {
                    key: `${type}${current}` as Shades,
                    value,
                };
            });
    return [...generate('light'), ...generate('dark').reverse(), initialShade];
};

export const shades: ShadeDefinitions = generateShades();

export const highContrastShades: ShadeDefinitions = generateShades(7);

export const colorsWithoutShade = [] as const;

export type ThemeColorsWithoutShade = (typeof colorsWithoutShade)[number];
export type ThemeColorsWithShade = Exclude<ThemeColors, ThemeColorsWithoutShade>;

export const isThemeColorWithoutShade = (color: unknown): color is ThemeColorsWithoutShade =>
    colorsWithoutShade.includes(color as ThemeColorsWithoutShade);

export const opacityMap = {
    1: 5,
    2: 10,
    3: 15,
    4: 20,
    5: 25,
    6: 30,
    7: 35,
    8: 40,
    9: 45,
    10: 50,
    11: 55,
    12: 60,
    13: 65,
    14: 70,
    15: 75,
    16: 80,
    17: 85,
    18: 90,
    19: 95,
    20: 100,
} as const;

/**
 * Opacity keys
 */
export type Opacity = keyof typeof opacityMap;

/**
 * Opacity values
 */
export type OpacityValues = (typeof opacityMap)[Opacity];

export type HexString = `#${string}`;

export const isHexString = (hex: string): hex is HexString => /^#[0-9A-F]{6}$/i.test(hex);

export type ThemeDefinition<Theme extends ThemeColors = ConfigurableThemeColors> = Record<
    Theme,
    HexString
>;

export type ThemeDefinitionWithGenerated = ThemeDefinition<
    ConfigurableThemeColors | GeneratedThemeColors
>;

export const shadeDelimiter = '_shade_' as const;
export type ShadeDelimiter = typeof shadeDelimiter;

export const opacityDelimiter = '_opacity_' as const;
export type OpacityDelimiter = typeof opacityDelimiter;

export type CssColorVariable<
    Color extends ThemeColors,
    Shade extends Shades = 'initial',
    OpacityValue extends Opacity = 20,
> = `${Color}${ShadeDelimiter}${Shade}${OpacityDelimiter}${OpacityValue}`;

export type CssColorVariables =
    | CssColorVariable<ThemeColorsWithShade, Shades, Opacity>
    | CssColorVariable<ThemeColorsWithoutShade, 'initial', Opacity>;

export type GeneratedTheme = Record<CssColorVariables, HslaString>;

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>;

type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;

export type Hue = IntRange<0, 361>;

export type Percentage = IntRange<0, 101>;

export type HslaString = `hsla(${string})`;

export type AllowedOffset = IntRange<0, 16>;

export type BackgroundLuminosity = IntRange<0, 30>;

export interface ThemeOptions {
    offset?: AllowedOffset;
    inverse?: boolean;
    highContrast?: boolean;
    coreSaturation?: Percentage;
    backgroundLuminosity?: BackgroundLuminosity;
}

export type ThemeWithOptions = { theme: ThemeDefinition; options?: ThemeOptions };

export type ThemeWithGeneratedAndOptions = {
    theme: ThemeDefinitionWithGenerated;
    options?: ThemeOptions;
};

/**
 * Eventually add loader
 */
export const initialTheme: ThemeDefinition = {
    brand: '#2FA2DB',
    brandBg: '#2FA2DB',
    additionalPink: '#EC407A',
    additionalPurple: '#AB47BC',
    additionalDeepPurple: '#7E57C2',
    additionalIndigo: '#5C6BC0',
    additionalLightBlue: '#29B6F6',
    additionalCyan: '#26C6DA',
    additionalTeal: '#26A69A',
    additionalLightGreen: '#9CCC65',
    additionalLime: '#D4E157',
    additionalAmber: '#FFCA28',
    additionalOrange: '#FFA726',
    additionalDeepOrange: '#FF7043',
    attentionErrorRed: '#EF5350',
    attentionWarningYellow: '#FFCA28',
    attentionInfoBlue: '#42A5F5',
    attentionSuccessGreen: '#66BB6A',
    contrastBlue: '#536DFE',
    contrastYellow: '#FFFF00',
    contrastOrange: '#FFAB40',
    contrastGreen: '#B2FF59',
    contrastDeepPurple: '#7C4DFF',
    contrastPink: '#FF4081',
    contrastCyan: '#18FFFF',
    contrastPurple: '#E040FB',
};

export const initialOptions: ThemeOptions = {
    offset: 0,
    inverse: false,
    highContrast: false,
    coreSaturation: 20,
    backgroundLuminosity: 15,
};
