import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { v4 as uuid } from 'uuid';

import { NxThemeService } from '@services/theme.service';
import { paramModel } from '@utils/signals';

const isSameDomain = (styleSheet: CSSStyleSheet): boolean => {
    if (!styleSheet.href) {
        return true;
    }

    return styleSheet.href.indexOf(window.location.origin) === 0;
};

const isStyleRule = (rule: CSSRuleList[number]): rule is CSSStyleRule => rule.type === 1;

const normalizeColor = (color: string): string => {
    return Number.isNaN(parseInt(color[0])) ? color : `rgb(${color})`;
};

const isColor = (strColor: string): boolean => {
    const normalizedColor = normalizeColor(strColor);
    const s = new Option().style;
    s.color = normalizedColor;
    return s.color !== '';
};

const rootSelectors = [
    ':root',
    'html',
    'html[data-theme="dark"]',
    'html[data-theme="light"]',
    'html[data-theme="light-gray"]',
    'html[data-theme="dark-gray"]',
    'html[data-theme="hsl"]',
] as const;

type RootSelector = (typeof rootSelectors)[number];

type PropMap = Record<
    RootSelector,
    Record<string, { value: string; className: string; showColorBlock: boolean }>
>;

const getRootProps = (): PropMap =>
    [...document.styleSheets]
        .filter(isSameDomain)
        .flatMap(({ cssRules }) => [...cssRules].filter(isStyleRule))
        .filter(rule =>
            rootSelectors.some(
                rootSelector =>
                    rule.selectorText.trim().includes(rootSelector) &&
                    !rule.selectorText.includes('_ngcontent') &&
                    !rule.selectorText.includes('data-theme-mode'),
            ),
        )
        .map(
            rule =>
                [
                    rule.selectorText.trim() as RootSelector,
                    [...rule.style].reduce(
                        (props, propName) =>
                            propName.startsWith('--')
                                ? {
                                      ...props,
                                      [propName.trim()]: {
                                          value: normalizeColor(
                                              rule.style.getPropertyValue(propName),
                                          ),
                                          className: `generated-${uuid()}`,
                                          showColorBlock: isColor(
                                              rule.style.getPropertyValue(propName),
                                          ),
                                      },
                                  }
                                : {},
                        {} as PropMap,
                    ),
                ] as const,
        )
        .reduce(
            (acc, [rootSelector, propMap]) => {
                const rootKey = rootSelector.split(',')[0].trim() as RootSelector;
                return {
                    ...acc,
                    [rootKey]: {
                        showColorBlock: Object.values({ ...acc[rootKey], ...propMap }).some(
                            (prop: PropMap[keyof PropMap]) => prop.showColorBlock,
                        ),
                        ...acc[rootKey],
                        ...propMap,
                    },
                };
            },
            rootSelectors.reduce((acc, curr) => ({ ...acc, [curr]: {} }), {} as PropMap),
        );

@Component({
    selector: 'css-variables-component',
    templateUrl: 'css-variables.component.html',
    styleUrls: ['css-variables.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule],
})
export class NxCssVariablesComponent {
    themeService = inject(NxThemeService);
    initialTheme = this.themeService.getTheme();

    tab$$ = paramModel('tab');

    selectedTab$$ = computed(() => this.tab$$() || ':root');

    tabNames = {
        ':root': 'Base CSS Variables',
        'html[data-theme="dark"]': 'Dark',
        'html[data-theme="light"]': 'Light',
        'html[data-theme="light-gray"]': 'Light Gray',
        'html[data-theme="dark-gray"]': 'Dark Gray',
        'html[data-theme="hsl"]': 'HSL',
    };

    propMap$$ = signal<PropMap>({} as PropMap);

    ngAfterViewInit(): void {
        this.propMap$$.set(getRootProps());
    }

    updateTheme = effect(() => {
        const selectedTab = this.selectedTab$$();
        const theme =
            ['light-gray', 'dark-gray', 'hsl', 'dark', 'light'].find(theme =>
                selectedTab.includes(theme),
            ) || this.initialTheme;
        this.themeService.setTheme(theme, undefined);
        if (theme.includes('gray')) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    });

    ngOnDestroy(): void {
        this.themeService.setTheme(this.initialTheme, undefined);
        document.documentElement.setAttribute('data-theme', this.initialTheme);
    }

    setStylesEffect = effect(() => {
        const propMap = this.propMap$$();
        const styleSheet = document.createElement('style');
        styleSheet.type = 'text/css';
        let innerHTML = '';
        Object.entries(propMap).forEach(([_, props]) =>
            Object.entries(props).forEach(([_, { value, className, showColorBlock }]) => {
                if (showColorBlock) {
                    innerHTML += `.${className} { background-color: ${value} !important; } `;
                }
            }),
        );
        styleSheet.innerHTML = innerHTML;
        document.head.appendChild(styleSheet);
    });
}
