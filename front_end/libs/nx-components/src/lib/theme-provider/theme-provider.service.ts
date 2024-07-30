import { Injectable, computed, signal } from '@angular/core';

import { background, textColor } from '../styles/core';

import { ColorGenerator, withGeneratedColors } from './color-generator';
import {
    GeneratedTheme,
    ThemeOptions,
    ThemeWithOptions,
    initialTheme,
    initialOptions,
    ThemeColors,
    HexString,
    ThemeDefinition,
} from './color-types';
import { createThemeUpdateEvent, themePatchEventName, themeResetEventName } from './events';

@Injectable({
    providedIn: 'platform',
})
export class NxThemeProviderService {
    private colorGenerator = new ColorGenerator();
    private readonly theme = signal<ThemeWithOptions>({
        theme: initialTheme,
        options: initialOptions,
    });
    public currentTheme = computed(() => {
        const { theme: initialTheme, options = {} } = this.theme();
        const theme = withGeneratedColors(initialTheme, options);
        return { theme, options };
    });
    public readonly colors = computed(() => this.colorGenerator.createTheme(this.currentTheme()));

    public updateThemeOptions(options: ThemeOptions): void {
        this.theme.update(({ theme, options: initialOptions = {} }: ThemeWithOptions) => {
            return {
                theme,
                options: {
                    ...initialOptions,
                    ...options,
                },
            };
        });
        this.notify();
    }

    public updateThemeColor(theme: Partial<ThemeDefinition>): void;
    public updateThemeColor(colorName: ThemeColors, colorValue: HexString): void;
    public updateThemeColor(
        colorNameOrThemePartial: ThemeColors | Partial<ThemeDefinition>,
        colorValue?: HexString,
    ): void {
        const updatedValues =
            typeof colorNameOrThemePartial === 'string'
                ? { [colorNameOrThemePartial]: colorValue }
                : colorNameOrThemePartial;
        this.theme.update(({ theme, options = {} }: ThemeWithOptions) => {
            return {
                theme: {
                    ...theme,
                    ...updatedValues,
                },
                options,
            };
        });
        this.notify();
    }

    public toggleTheme(inverse?: boolean): void {
        this.theme.update(({ theme, options = {} }: ThemeWithOptions) => {
            inverse = inverse ?? !options?.inverse;
            return {
                theme,
                options: {
                    ...options,
                    inverse,
                },
            };
        });
        this.notify();
    }

    public getColorsWithThemeOverride(options: ThemeOptions): GeneratedTheme {
        const { theme, options: baseOptions = {} } = this.currentTheme();
        options = {
            ...baseOptions,
            ...options,
        };
        return this.colorGenerator.createTheme({
            theme: withGeneratedColors(theme, options),
            options,
        });
    }

    private notify(): void {
        window.dispatchEvent(createThemeUpdateEvent(this.theme()));

        if (window.IS_STORYBOOK) {
            this.updateStorybookBackground();
        }
    }

    private updateStorybookBackground(): void {
        const updatedColors = this.colors();
        document.body.style.setProperty('background', updatedColors[background]);
        document.body.style.setProperty('color', updatedColors[textColor]);
        document.querySelectorAll<HTMLElement>('.docs-story').forEach(element => {
            element.style.setProperty('background', updatedColors[background]);
            element.style.setProperty('color', updatedColors[textColor]);
        });
    }

    constructor() {
        if (window.IS_STORYBOOK) {
            const themeAttribute = 'storybook-theme';
            const updateThemeFromStoryBookDataAttribute = (resetInitial = false): void => {
                const updatedValue = document.body.parentElement!.getAttribute(themeAttribute);

                if (updatedValue) {
                    const darkMode = updatedValue.includes('dark');
                    const gray = updatedValue.includes('gray');
                    const highContrast = updatedValue.includes('high-contrast');
                    const options = {
                        ...initialOptions,
                        offset: gray ? 10 : 0,
                        inverse: darkMode,
                        highContrast,
                        coreSaturation: 20,
                        backgroundLuminosity: 15,
                        useHct: false,
                    };

                    if (resetInitial) {
                        this.theme.set({ theme: initialTheme, options } as ThemeWithOptions);
                    } else {
                        this.theme.update(
                            ({ theme }) =>
                                ({
                                    theme,
                                    options,
                                }) as ThemeWithOptions,
                        );
                    }
                    this.notify();
                }
            };

            new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (
                        mutation.type === 'attributes' &&
                        mutation.attributeName === themeAttribute
                    ) {
                        updateThemeFromStoryBookDataAttribute();
                    }
                });
            }).observe(document.body.parentElement!, { attributes: true });

            window.addEventListener(themeResetEventName, () => {
                updateThemeFromStoryBookDataAttribute(true);
            });
        }

        this.notify();

        window.addEventListener(themePatchEventName, ({ detail }) => {
            const currentTheme = this.theme();
            const {
                theme: themePatch = currentTheme.theme,
                options: optionsPatch = currentTheme.options,
            } = detail;

            const theme = {
                ...currentTheme.theme,
                ...themePatch,
            };

            const options = {
                ...currentTheme.options,
                ...optionsPatch,
            };

            console.info({ options });

            this.theme.set({ theme, options });
            this.notify();
        });
    }
}
