import { generateCssVariableName } from '../theme-provider';

export const fontColorsCommon = {
    '--font-color-medium': generateCssVariableName('core', 'light9'),
    '--font-color-regular': generateCssVariableName('core', 'light9'),
    '--font-color-light': generateCssVariableName('core', 'light12'),
    '--font-color-disabled': generateCssVariableName('core', 'light10'),
    '--font-color-error': generateCssVariableName('attentionErrorRed', 'initial'),
    '--font-color-brand': generateCssVariableName('brand', 'initial'),
} as const;
