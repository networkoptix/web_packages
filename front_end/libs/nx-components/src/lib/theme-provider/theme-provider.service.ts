import { Injectable, computed, signal } from '@angular/core';

import { background, textColor } from '../styles/core';

import { ColorGenerator, withGeneratedColors } from './color-generator';
import {
    GeneratedTheme,
    ThemeOptions,
    ThemeWithOptions,
    initialTheme,
    initialOptions,
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
        return this.colorGenerator.createTheme({
            theme,
            options: {
                ...baseOptions,
                ...options,
            },
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
                        offset: gray ? 10 : 0,
                        inverse: darkMode,
                        highContrast,
                        coreSaturation: 20,
                        backgroundLuminosity: 15,
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
