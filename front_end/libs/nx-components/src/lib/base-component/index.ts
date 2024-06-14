import { Directive, ElementRef, Signal, effect, inject } from '@angular/core';

import { CssColorVariables, ThemeOptions } from '../theme-provider/color-types';
import { NxThemeProviderService } from '../theme-provider/theme-provider.service';

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
    abstract variablesDeclaration: Signal<Record<string, CssColorVariables>>;

    protected readonly updateStyleEffect = effect(() => {
        const variablesDeclaration = this.variablesDeclaration();
        const themeOverride = this.themeOptionOverride?.();
        const themeColors = themeOverride
            ? this.themeProvider.getColorsWithThemeOverride(themeOverride)
            : this.themeProvider.colors();
        Object.entries(variablesDeclaration).forEach(([variableName, colorName]) => {
            const baseVar = `${colorName.startsWith('--') ? colorName : `--${colorName}`}`;
            this.elRef.nativeElement.style.setProperty(baseVar, themeColors[colorName]);
            this.elRef.nativeElement.style.setProperty(
                variableName.startsWith('--') ? variableName : `--${variableName}`,
                `var(${baseVar})`,
            );
        });
    });
}
