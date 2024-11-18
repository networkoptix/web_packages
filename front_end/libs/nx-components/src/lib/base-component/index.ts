import { computed, Directive, effect, ElementRef, inject, Signal } from '@angular/core';

import { commonColors } from '../styles/colors';
import { fontColorsCommon } from '../styles/fonts';
import { CssColorVariables, stepCount, ThemeOptions } from '../theme-provider/color-types';
import { createComponentVariablesEvent } from '../theme-provider/events';
import { NxThemeProviderService } from '../theme-provider/theme-provider.service';

type Native = 'currentColor' | 'initial';
const useNative = (color: CssColorVariables | Native): color is Native =>
    ['currentColor', 'initial'].includes(color);

@Directive()
export abstract class BaseComponent {
    protected elRef = inject<ElementRef<HTMLElement>>(ElementRef);
    protected themeProvider = inject(NxThemeProviderService);

    /**
     * Override this to provide a custom theme option, such as to always invert the colors.
     */
    themeOptionOverride?: Signal<ThemeOptions | undefined>;

    /**
     * Example
     *
     * ```
     *   override variablesDeclaration = computed(() => {
     *       const isFunky = this.variant() === 'funky';
     *       return isFunky
     *           ? ({
     *                 '--example-background-color': 'danger',
     *                 '--example-text-color': 'warning',
     *             } as const)
     *           : ({
     *                 '--example-background-color': 'light',
     *                 '--example-text-color': 'dark',
     *             } as const);
     *   });
     * ```
     */
    variablesDeclaration: Signal<Record<string, CssColorVariables | 'currentColor' | 'initial'>> =
        computed(() => ({}) as const);

    // Add common colors here
    protected readonly commonColors = { ...fontColorsCommon, ...commonColors } as const;

    protected readonly updateStyleEffect = effect(() => {
        const colorVariablesDeclarations = {
            ...this.commonColors,
            ...this.variablesDeclaration(),
            currentColor: 'currentColor' as const,
            initial: 'initial' as const,
        };

        const themeOverride = this.themeOptionOverride?.();
        const themeColors = themeOverride
            ? this.themeProvider.getColorsWithThemeOverride(themeOverride)
            : this.themeProvider.colors();
        Object.entries(colorVariablesDeclarations).forEach(([variableName, colorName]) => {
            const baseVar = useNative(colorName)
                ? colorName
                : `${colorName.startsWith('--') ? colorName : `--${colorName}`}`;
            if (!useNative(colorName)) {
                this.elRef.nativeElement.style.setProperty(baseVar, themeColors[colorName]);
            }
            this.elRef.nativeElement.style.setProperty(
                variableName.startsWith('--') ? variableName : `--${variableName}`,
                useNative(colorName) ? colorName : `var(${baseVar})`,
            );
        });

        // Theme option css variables

        const { options } = this.themeProvider.currentTheme();
        const offset = options.offset || 0;
        const inverse = options.inverse || false;
        const stepSize = (100 - offset * 2) / stepCount;
        const otherDeclarations = {
            '--step-size': `${stepSize.toPrecision(2)}%`,
            '--color-mix-base': inverse ? 'black' : 'white',
        };
        Object.entries(otherDeclarations).forEach(([variableName, variableValue]) =>
            this.elRef.nativeElement.style.setProperty(variableName, variableValue),
        );

        if (window.IS_STORYBOOK) {
            window.dispatchEvent(
                createComponentVariablesEvent(
                    Object.fromEntries([
                        ...Object.entries(colorVariablesDeclarations).map(([key, value]) => [
                            key,
                            [value, useNative(value) ? value : themeColors[value]],
                        ]),
                        ...Object.entries(otherDeclarations).map(([key, value]) => [
                            key,
                            [value, 'transparent'],
                        ]),
                    ]),
                ),
            );
        }
    });
}
