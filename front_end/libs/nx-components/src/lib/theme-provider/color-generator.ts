import { hex, hsl } from 'color-convert';
import { HSL } from 'color-convert/conversions';
import { clamp, memoize } from 'lodash-es';
import stringify from 'safe-stable-stringify';

import {
    CssColorVariables,
    GeneratedTheme,
    Percentage,
    HslaString,
    Opacity,
    Shades,
    ThemeColors,
    ThemeColorsWithShade,
    ThemeColorsWithoutShade,
    ThemeDefinition,
    isThemeColorWithoutShade,
    Hue,
    shades,
    opacityMap,
    ThemeOptions,
    CssColorVariable,
    highContrastShades,
    ShadeValues,
    ThemeWithGeneratedAndOptions,
    HexString,
} from './color-types';

const hash = (...args: unknown[]): string => stringify(args);

/**
 * Returns exact color defined in the base theme. Useful for getting exact for cases like branding.
 *
 * @param baseColor - Theme Base Color
 */
export function generateCssVariableName<Color extends ThemeColors>(
    baseColor: Color,
): CssColorVariable<Color>;
/**
 * Returns theme color with defined luminosity.
 *
 * @param baseColor - Theme Base Color
 * @param shade - Luminosity
 */
export function generateCssVariableName<Color extends ThemeColorsWithShade, Shade extends Shades>(
    baseColor: Color,
    shade: Shade,
): CssColorVariable<Color, Shade>;
/**
 * Returns theme color with defined luminosity and opacity.
 *
 * @param baseColor - Theme Base Color
 * @param shade - Luminosity
 * @param opacity - Opacity
 */
export function generateCssVariableName<
    Color extends ThemeColorsWithShade,
    Shade extends Shades,
    OpacityValue extends Opacity,
>(
    baseColor: Color,
    shade: Shade,
    opacity: OpacityValue,
): CssColorVariable<Color, Shade, OpacityValue>;
/**
 * Returns theme color with shade disables with opacity.
 *
 * @param baseColor - Theme Base Color with shade disabled
 * @param opacity - Opacity
 */
export function generateCssVariableName<
    Color extends ThemeColorsWithoutShade,
    OpacityValue extends Opacity,
>(baseColor: Color, opacity: OpacityValue): CssColorVariable<Color, 'initial', OpacityValue>;
export function generateCssVariableName(
    baseColor: ThemeColors,
    shadeOrOpacity: Shades | Opacity = 'initial',
    opacity: Opacity = 20,
): unknown {
    const noShade = isThemeColorWithoutShade(baseColor);
    const shade = noShade ? 'initial' : (shadeOrOpacity as Shades);

    if (noShade) {
        return `${baseColor}_shade_initial_opacity_${opacity}`;
    }

    return `${baseColor}_shade_${shade}_opacity_${opacity}`;
}

export const generateHslaString = memoize(
    (
        hue: Hue,
        saturation: Percentage,
        lightness: Percentage,
        alpha: Percentage = 100,
    ): HslaString => {
        const values = `${hue}, ${saturation}%, ${lightness}%, ${alpha / 100}`;
        return `hsla(${values})`;
    },
    hash,
);

const extractBaseHexColor = memoize(
    (theme: ThemeDefinition<ThemeColors>, colorVariable: CssColorVariables): HSL => {
        const baseColor = colorVariable.split('_')[0] as ThemeColors;
        return hex.hsl(theme[baseColor]);
    },
    hash,
);

const extractShade = memoize(
    (colorVariable: CssColorVariables, inverse: boolean, highContrast: boolean): ShadeValues => {
        let shadeFromVariable = colorVariable.split('_shade_')[1]?.split('_')?.[0] as Shades;
        if (inverse && shadeFromVariable !== 'initial') {
            const replaceOrder = shadeFromVariable.includes('dark')
                ? ['dark', 'light']
                : ['light', 'dark'];
            shadeFromVariable = shadeFromVariable.replace(
                replaceOrder[0],
                replaceOrder[1],
            ) as Shades;
        }

        const parsedShade =
            (highContrast ? highContrastShades : shades).find(
                ({ key }) => key === shadeFromVariable,
            )?.value ?? 51;
        return parsedShade;
    },
    hash,
);

export const extractOpacity = memoize((colorVariable: CssColorVariables): Percentage => {
    const opacity = parseInt(colorVariable.split('_opacity_')[1] || '100');
    const parsedOpacity = opacityMap[opacity as Opacity] || 100;
    return parsedOpacity;
}, hash);

const generateHslaStringFromTheme = memoize(
    (
        theme: ThemeDefinition<ThemeColors>,
        colorVariable: CssColorVariables,
        options: ThemeOptions,
    ): HslaString => {
        const { offset = 0, inverse = false, highContrast = false } = options;
        const [hue, saturation, baseLuminosity] = extractBaseHexColor(theme, colorVariable) as [
            Hue,
            Percentage,
            Percentage,
        ];

        const applyOffset = (luminosity: Percentage): Percentage => {
            if (offset && luminosity) {
                if (inverse) {
                    luminosity += offset;
                } else {
                    luminosity -= offset;
                }
            }
            return clamp(luminosity, 0, 100) as Percentage;
        };

        const extractedLuminosity = extractShade(colorVariable, inverse, highContrast);
        const luminosity =
            extractedLuminosity === 'initial' ? baseLuminosity : applyOffset(extractedLuminosity);
        const opacity = extractOpacity(colorVariable);
        return generateHslaString(hue, saturation, luminosity, opacity);
    },
    hash,
);

const applyCoreSaturation = memoize((base: HexString, options: ThemeOptions): HexString => {
    const { coreSaturation = 15 } = options;
    const [hue, _, luminosity] = hex.hsl(base);
    return hsl.hex([hue, coreSaturation, luminosity]) as HexString;
}, hash);

export const withGeneratedColors = memoize(
    (initialTheme: ThemeDefinition, options: ThemeOptions): ThemeDefinition<ThemeColors> => {
        return {
            ...initialTheme,
            core: applyCoreSaturation(initialTheme.brand, options),
        };
    },
    hash,
);

export class ColorGenerator {
    createTheme = memoize(({ theme, options }: ThemeWithGeneratedAndOptions): GeneratedTheme => {
        const target = {} as GeneratedTheme;
        return new Proxy(target, {
            get(target, colorCode: keyof GeneratedTheme) {
                if (!(colorCode in target)) {
                    target[colorCode] = generateHslaStringFromTheme(
                        theme,
                        colorCode,
                        options || {},
                    );
                }
                const value = Reflect.get(target, colorCode);
                console.info({
                    colorCode,
                    value,
                });
                return value;
            },
        });
    }, hash);
}
