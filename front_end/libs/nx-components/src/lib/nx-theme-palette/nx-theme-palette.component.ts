import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BaseComponent } from '../base-component';
import { generateCssVariableName } from '../theme-provider/color-generator';
import {
    GeneratedThemeColors,
    generatedThemeColors,
    IntRange,
    Opacity,
    opacityMap,
    OpacityValues,
    Shades,
    shades,
    themeColors,
    ThemeColors,
} from '../theme-provider/color-types';
import {
    baseColorStorybookEventName,
    colorGroupStorybookEventName,
} from '../theme-provider/events';

import { Show, show } from './utils';

const normalizeShade = (shade: Shades): number | 'initial' => {
    if (shade === 'initial') {
        return shade;
    }

    return shades.findIndex(({ key }) => key === shade);
};

/**
 * An example Component
 */
@Component({
    selector: 'nx-theme-palette',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './nx-theme-palette.component.html',
    styleUrl: './nx-theme-palette.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxThemePalette extends BaseComponent {
    /**
     * A signal input example
     */
    selectedBaseColor = model<ThemeColors | 'all'>('brand');
    show = model<Show>(show[0]);
    bindShowToStorybook = model(false);

    protected readonly themeColors = computed(() => {
        const theme = this.themeProvider.currentTheme().theme;
        const show = this.show();
        return Object.keys(theme)
            .filter(key => {
                if (show === 'all') {
                    return true;
                }

                const matched = key.includes(show);

                if (['generated', 'brand'].includes(show)) {
                    return matched || generatedThemeColors.includes(key as GeneratedThemeColors);
                }
                return matched;
            })
            .sort() as ThemeColors[];
    });

    activeColor = signal<ThemeColors>(this.themeColors()[0]);

    protected readonly configurable = [...themeColors] as ThemeColors[];

    readonly shades = shades
        .map(({ key }) => key)
        .sort((a, b) => {
            const normalizedA = normalizeShade(a);
            const normalizedB = normalizeShade(b);
            const aIsString = typeof normalizedA === 'string';
            const bIsString = typeof normalizedB === 'string';
            if (aIsString || bIsString) {
                return aIsString ? -1 : 1;
            }

            return normalizedA - normalizedB;
        });

    readonly opacityList = Object.values(opacityMap).sort((a, b) => b - a);

    generateBackground = (
        base: ThemeColors,
        shade: Shades,
        opacity: OpacityValues,
    ): { 'background-color': string; color: string } => {
        const colors = this.themeProvider.colors();
        const opacityKey = parseInt(
            Object.entries(opacityMap).find(([_, value]) => value === opacity)![0],
        ) as Opacity;
        const backgroundKey = generateCssVariableName(base, shade, opacityKey);
        const normalized = normalizeShade(shade);
        const contrastKey = generateCssVariableName(
            base,
            (typeof normalized === 'number' && -normalized > 50 ? 'dark1' : 'light1') as Shades,
            opacityKey,
        );

        const backgroundColor = `${colors[backgroundKey]} !important`;
        const color = `${colors[contrastKey]} !important`;

        console.info({ backgroundColor });

        return {
            'background-color': backgroundColor,
            color,
        };
    };

    generateNote = (
        base: ThemeColors,
        shade: Shades,
    ): { style: { color: string }; text: string[] } => {
        const colors = this.themeProvider.colors();
        const backgroundKey = generateCssVariableName(base, shade);
        const shadeInt = Math.max(
            19 - parseInt(shade.replace('dark', '').replace('light', '')),
            6,
        ) as IntRange<1, 19>;
        const contrast = shade.includes('dark') ? 'light' : 'dark';
        console.info({ shadeInt });
        const colorKey = generateCssVariableName(base, `${contrast}${shadeInt}`);
        const [h, s, l] = colors[backgroundKey]
            .split('(')[1]
            .split(')')[0]
            .split(',')
            .map(val => Math.round(parseFloat(val)));
        return {
            style: { color: `${colors[colorKey]} !important` },
            text: ['HSL:', `${h}`, `${s}%`, `${l}%`],
        };
    };

    generateLabel = (base: ThemeColors): { 'background-color': string; color: string } => {
        const colors = this.themeProvider.colors();
        return {
            'background-color': `${colors[generateCssVariableName(base, 'dark9')]} !important`,
            color: `${colors[generateCssVariableName(base, 'light9')]} !important`,
        };
    };

    protected base = computed(() => {
        const selectedBaseColor = this.selectedBaseColor();
        return selectedBaseColor === 'all' ? 'brand' : selectedBaseColor;
    });

    protected singleColor = computed(() => {
        const selectedBaseColor = this.selectedBaseColor();
        if (selectedBaseColor === 'all') {
            return false;
        }

        return selectedBaseColor;
    });

    override variablesDeclaration = computed(() => {
        const base = this.base();
        return {
            '--bg-color-base': generateCssVariableName('core', 'dark8'),
            '--bg-color-accent': generateCssVariableName(base, 'dark8'),
            '--contrast-core': generateCssVariableName('core', 'light8'),
            '--base-actual': generateCssVariableName(base, 'initial'),
            '--base-contrast': generateCssVariableName(base, 'light4'),
        };
    });

    baseValue = computed(() => this.themeProvider.currentTheme().theme[this.base()]);

    heading = computed(() => {
        const selectedBaseColor = this.selectedBaseColor();
        if (selectedBaseColor === 'all') {
            const show = this.show();
            return show === 'all' ? 'Showing Full Palette' : `Showing ${show} colors`;
        }

        return `Showing variants for "${this.selectedBaseColor()}" with a base color of ${this.baseValue()}`;
    });

    private handleStorybookChange = ({ detail }: { detail: ThemeColors }): void => {
        this.activeColor.set(detail);
        this.selectedBaseColor.update(current => (current === 'all' ? current : detail));
    };

    private handleStoryBookGroupChange = ({ detail }: { detail: Show }): void => {
        if (this.bindShowToStorybook()) {
            this.show.set(detail);
        }
    };

    ngOnInit(): void {
        window.addEventListener(baseColorStorybookEventName, this.handleStorybookChange);
        window.addEventListener(colorGroupStorybookEventName, this.handleStoryBookGroupChange);
    }

    ngOnDestroy(): void {
        window.removeEventListener(baseColorStorybookEventName, this.handleStorybookChange);
        window.removeEventListener(colorGroupStorybookEventName, this.handleStoryBookGroupChange);
    }
}
