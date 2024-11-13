import { effect, inject, Injectable, signal } from '@angular/core';
import { hsl } from 'color-convert';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

import themeCssVars from '@common/styles/theme-css-vars.json';
import { reloadWindowsChannel } from '@utils/general';
import {
    CssColorVariables,
    generateCssVariableName,
    HslaString,
    NxThemeProviderService,
    Opacity,
    ShadeRange,
    ThemeWithOptions,
} from 'nx-components';

import { nxConfig } from './config';
import { IConfig } from './config-types';
import { DynamicConfig } from './dynamic-config';

const findNode = <T>(targetObject: T, nodes: (string | symbol)[]): unknown =>
    nodes.reduce((ref, nodeName) => ref[nodeName], targetObject);

const extractHslValues = (hslaString: string): [number, number, number] => {
    const hslRegex = /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/;
    const match = hslaString.match(hslRegex);

    if (match) {
        const [, h, s, l] = match;
        return [parseInt(h, 10), parseInt(s, 10), parseInt(l, 10)];
    }

    throw new Error('Invalid HSLA string');
};

const handleRgb = (hslaString: HslaString, themeColor: string): string => {
    if (themeColor.endsWith('--rgb')) {
        try {
            const hslValues = extractHslValues(hslaString);
            const rgbValues = hsl.rgb(hslValues);
            return rgbValues.join(', ');
        } catch {}
    }

    return hslaString;
};

type ColorMappingFunction = (themeColor: string) => CssColorVariables | void;

type MatchedColorMappingFunction = (themeColor: string) => CssColorVariables;

const handleCoreColors: ColorMappingFunction = themeColor => {
    const matchedCore = themeColor.match(/^--(dark|light)/)?.[0];
    if (!matchedCore) {
        return;
    }

    const baseShade = matchedCore === '--dark' ? 'dark' : 'light';
    const shadeValue = Math.min(
        parseInt(themeColor.replace(matchedCore, '').split('_').pop()!),
        18,
    ) as ShadeRange;
    const shade: `${typeof baseShade}${typeof shadeValue}` = `${baseShade}${shadeValue}`;
    return generateCssVariableName('core', shade);
};

const handleBrandColors: ColorMappingFunction = themeColor => {
    const opacity = parseInt(themeColor.split('t')[1] || '0');
    if (themeColor.includes('--brand-core')) {
        return generateCssVariableName(
            'brand',
            'initial',
            opacity ? ((opacity / 5) as Opacity) : 20,
        );
    }

    const matchedBrand = themeColor.match(/^--brand-(d|l)/)?.[0];

    if (!matchedBrand) {
        return;
    }
    const brandShade = matchedBrand === '--dark-d' ? 'dark' : 'light';
    const shadeValue = (18 - parseInt(themeColor.replace(matchedBrand, ''))) as ShadeRange;
    const shade: `${typeof brandShade}${typeof shadeValue}` = `${brandShade}${shadeValue}`;
    if (opacity) {
        return generateCssVariableName('brand', shade, (opacity / 5) as Opacity);
    }
    return generateCssVariableName('brand', shade);
};

const handleAdditionalColors: ColorMappingFunction = themeColor => {
    const lookup: Record<string, CssColorVariables | ''> = {
        '--blue12': generateCssVariableName('additionalLightBlue', 'dark15'),
        '--blue9': generateCssVariableName('additionalLightBlue', 'light16'),
        '--bluez': generateCssVariableName('additionalIndigo', 'dark13'),
        '--bluez-bright': generateCssVariableName('additionalIndigo', 'light18'),
        '--bluez-light': generateCssVariableName('additionalIndigo', 'light6'),
        '--bluez-light-dim': generateCssVariableName('additionalIndigo', 'light7'),
        '--cyan400': generateCssVariableName('additionalCyan', 'dark15'),
        '--cyan600': generateCssVariableName('additionalCyan', 'dark10'),
        '--green_d1': generateCssVariableName('attentionSuccessGreen', 'dark11'),
        '--green_d2': generateCssVariableName('attentionSuccessGreen', 'dark9'),
        '--green_d2--rgb': generateCssVariableName('attentionSuccessGreen', 'dark7'),
        '--green_l1': generateCssVariableName('attentionSuccessGreen', 'dark15'),
        '--green_l2': generateCssVariableName('attentionSuccessGreen', 'dark17'),
        '--green_l2--rgb': generateCssVariableName('attentionSuccessGreen', 'dark17'),
        '--green_main': generateCssVariableName('attentionSuccessGreen', 'dark13'),
        '--orange_d1': generateCssVariableName('additionalOrange', 'dark18'),
        '--orange_l1': generateCssVariableName('additionalOrange', 'light18'),
        '--purple400': generateCssVariableName('additionalDeepPurple', 'light17'),
        '--purple500': generateCssVariableName('additionalDeepPurple', 'light18'),
        '--red-l2': generateCssVariableName('attentionErrorRed', 'light17'),
        '--red1': generateCssVariableName('attentionErrorRed', 'light6'),
        '--red2': generateCssVariableName('attentionErrorRed', 'light3'),
        '--red2_dim': generateCssVariableName('attentionErrorRed', 'light6'),
        '--red2_dimmer': generateCssVariableName('attentionErrorRed', 'light8'),
        '--red_d1': generateCssVariableName('attentionErrorRed', 'dark15'),
        '--red_d1_lighter': generateCssVariableName('attentionErrorRed', 'dark18'),
        '--red_d2': generateCssVariableName('attentionErrorRed', 'dark12'),
        '--red_d3': generateCssVariableName('attentionErrorRed', 'dark10'),
        '--red_d4': generateCssVariableName('attentionErrorRed', 'dark8'),
        '--red_l1': generateCssVariableName('attentionErrorRed', 'light18'),
        '--red_l2': generateCssVariableName('attentionErrorRed', 'light3'),
        '--red_main': generateCssVariableName('attentionErrorRed', 'dark15'),
        '--red_main--rgb': generateCssVariableName('attentionErrorRed', 'dark15'),
        '--yellow-l1': generateCssVariableName('attentionWarningYellow', 'light8'),
        '--yellow-l2': generateCssVariableName('attentionWarningYellow', 'light6'),
        '--yellow-main': generateCssVariableName('attentionWarningYellow', 'light18'),
        '--yellow_d2': generateCssVariableName('attentionWarningYellow', 'dark15'),
        '--yellow_d2_lighter': generateCssVariableName('attentionWarningYellow', 'light15'),
        '--yellow_d3': generateCssVariableName('attentionWarningYellow', 'dark8'),
        '--yellow_l1': generateCssVariableName('attentionWarningYellow', 'light8'),
        '--yellow_l2': generateCssVariableName('attentionWarningYellow', 'light6'),
        '--yellow_l3': generateCssVariableName('attentionWarningYellow', 'light2'),
        '--yellow_main': generateCssVariableName('attentionErrorRed', 'dark15'),
        '--yellow_main--rgb': generateCssVariableName('attentionErrorRed', 'dark15'),
    };

    const matched = lookup[themeColor];

    if (matched) {
        return matched;
    }
};

const additionalColorsLookup = {
    '--additional_dark1': generateCssVariableName('core', 'dark8'),
    '--additional-light1': generateCssVariableName('core', 'light1'),
    '--additional-light3': generateCssVariableName('core', 'light3'),
    '--additional_gray_light1': generateCssVariableName('core', 'light1'),
    '--additional_gray_light2': generateCssVariableName('core', 'light1'),
    '--additional_gray_light3': generateCssVariableName('core', 'light1'),
    '--additional_light1': generateCssVariableName('core', 'light1'),
    '--additional_light2': generateCssVariableName('core', 'light2'),
    '--additional_light3': generateCssVariableName('core', 'light3'),
    '--additional_light8': generateCssVariableName('core', 'light3'),
};

const handleAdditionalShades: ColorMappingFunction = themeColor => {
    if (themeColor in additionalColorsLookup) {
        return additionalColorsLookup[themeColor];
    }
};

const mapToNewThemeColor = (themeColor: string): CssColorVariables | void => {
    const matchedMappingFunction = (
        colorMappingFunction: ColorMappingFunction,
    ): colorMappingFunction is MatchedColorMappingFunction =>
        colorMappingFunction(themeColor) !== undefined;

    const colorMappingFunctions: ColorMappingFunction[] = [
        handleCoreColors,
        handleBrandColors,
        handleAdditionalShades,
        handleAdditionalColors,
    ];

    const mapper = colorMappingFunctions.find(matchedMappingFunction);

    if (mapper) {
        return mapper(themeColor);
    }
    // This shouldn't be reachable. If this code is executed, it means that a theme color wasn't mapped correctly.
    // Using this as a fallback so that it's obvious that the color wasn't substituted correctly.
    // Add breakpoint here to check if all theme colors are mapped
    // console.info('Not Mapped', themeColor);
};

@Injectable({
    providedIn: 'root',
})
export class NxConfigService {
    config: IConfig;
    static OVERRIDE_KEY = 'configOverrides';

    static configChanged: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    reloadAllWindows = (includeCurrent = false): void =>
        reloadWindowsChannel.reloadAllWindows(includeCurrent);

    constructor(private session?: LocalStorageService) {
        // These properties will be injected on config *******************
        // viewsDir: 'static/views/', //'static/lang_' + lang + '/views/';
        // previewPath: '',
        // ***************************************************************

        try {
            const dynamicConfig = inject(DynamicConfig);
            this.config = dynamicConfig?.config;
        } catch (_) {}

        this.config ||= nxConfig;
        this.updateConfigUsingOverrides();
        this.attachDebugConfigToWindow();
        this.useNewThemeColors.set(!!this.config.featureFlags.newCloudColorProvider);
        if (this.config.featureFlags.newCloudColorProvider) {
            const { theme = {}, options = {} }: ThemeWithOptions<true> = (() => {
                try {
                    const themeConfig = JSON.parse(
                        localStorage.getItem('newThemeConfig') || '{}',
                    ) as ThemeWithOptions & { name: string };
                    if (
                        !this.config.preloadedAccount ||
                        !themeConfig.name ||
                        themeConfig.name === 'From Customization'
                    ) {
                        throw new Error('Use theme from customization');
                    }
                    return themeConfig;
                } catch {
                    return {
                        theme: {
                            brand: nxConfig.themeColors.brand,
                            brandBg: nxConfig.themeColors.brandBg,
                        },
                    } as ThemeWithOptions;
                }
            })();
            const setThemeMode = (): void =>
                this.themeProvider.updateThemeOptions({
                    ...options,
                    inverse: !!document.querySelector('html[data-theme="dark"]'),
                });
            setThemeMode();
            new MutationObserver(setThemeMode).observe(document.querySelector('html')!, {
                attributes: true,
                attributeFilter: ['data-theme'],
            });
            // window.IS_STORYBOOK = true;
            this.themeProvider.updateThemeColor(theme);
            document.querySelector('html')!.classList.add('new-cloud-colors');
        }
    }

    protected themeProvider = inject(NxThemeProviderService);

    private useNewThemeColors = signal(false);

    protected ensureCorrectDataTheme = effect(
        () => {
            if (!this.useNewThemeColors()) {
                return;
            }

            const dataTheme = document.querySelector('html')!.getAttribute('data-theme');

            const graySegment = '-gray';

            if (dataTheme?.includes(graySegment)) {
                // Use light and dark instead of light-gray and dark-gray style sheets
                document
                    .querySelector('html')
                    ?.setAttribute('data-theme', dataTheme.replace(graySegment, ''));

                // Apply gray offset to the theme
                this.themeProvider.updateThemeOptions({
                    offset: 5,
                    coreSaturation: 0,
                });
            }
        },
        { allowSignalWrites: true },
    );

    unmappedColors$$ = signal<string[]>([]);

    protected defineNewThemeColors = effect(
        () => {
            if (!this.useNewThemeColors()) {
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).themeProvider ||= this.themeProvider;
            const colors = this.themeProvider.getColorsWithThemeOverride({
                inverse: true,
                ignoreInverseForOffset: true,
            });
            // Temporary debugging
            const root = document.querySelector('html')!;
            const unmapped = themeCssVars
                .map(themeColor => {
                    const cssVariableName = mapToNewThemeColor(themeColor);
                    if (cssVariableName || nxConfig.allowDebugMode) {
                        const hslaString =
                            colors[
                                cssVariableName ||
                                    generateCssVariableName('attentionErrorRed', 'dark10')
                            ];
                        root.style.setProperty(themeColor, handleRgb(hslaString, themeColor));
                    }
                    return cssVariableName ? false : themeColor;
                })
                .filter((val): val is string => !!val);
            if (unmapped.length) {
                console.error({ unmapped });
                this.unmappedColors$$.set(unmapped);
            }
        },
        { allowSignalWrites: true },
    );

    public generateDebugConfigProxy(): IConfig {
        // @ts-expect-error: Dev debugging stuff
        window.resetConfigOverrides = () =>
            window.confirm('Do you want to reset overrides?') &&
            this.session.store(NxConfigService.OVERRIDE_KEY, {}) &&
            window.confirm('Reload page to update config?') &&
            window.location.reload();

        const debugHandlerFactory = (
            (configRef = this.config, session = this.session, windowRef = window) =>
            (nodeNames: (string | symbol)[] = []): ProxyHandler<IConfig> => ({
                set(target, property, value) {
                    const currentNodeString = [...nodeNames, property].join('.');
                    session.store(NxConfigService.OVERRIDE_KEY, {
                        ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                        [currentNodeString]: value,
                    });
                    if (windowRef.confirm('Reload window to apply changes?')) {
                        windowRef.location.reload();
                    }
                    return true;
                },
                get(target, property) {
                    const currentNode = [...nodeNames, property];
                    const currentNodeString = currentNode.join('.');
                    const value = findNode(configRef, currentNode);
                    if (property === 'toJSON') {
                        return () => "Don't use";
                    }
                    const settingType = typeof value;
                    if (['number', 'boolean', 'string'].includes(settingType)) {
                        // Replace primitive values with updater
                        return {
                            value,
                            settingType,
                            get showPromptNewValue() {
                                const newValue = windowRef.prompt(
                                    `Updated Value for "${currentNodeString}"`,
                                    value as string,
                                );
                                session.store(NxConfigService.OVERRIDE_KEY, {
                                    ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                                    [currentNodeString]: newValue,
                                });
                                if (windowRef.confirm('Reload window to apply changes?')) {
                                    windowRef.location.reload();
                                }
                                return newValue;
                            },
                            saveSetting(newValue, reload = false) {
                                session.store(NxConfigService.OVERRIDE_KEY, {
                                    ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                                    [currentNodeString]: newValue,
                                });
                                if (reload) {
                                    windowRef.location.reload();
                                }
                            },
                        };
                    } else if (typeof value === 'object') {
                        return new Proxy(value, debugHandlerFactory([...nodeNames, property]));
                    }
                },
            })
        )();

        return new Proxy(this.config, debugHandlerFactory());
    }

    private attachDebugConfigToWindow(): void {
        if (window) {
            // @ts-expect-error: Dev debugging stuff
            window.debugConfig = this.generateDebugConfigProxy();
        }
    }

    get cloudHost(): string {
        return this.config.cloudHost;
    }

    updateConfigUsingOverrides(config = this.config): void {
        Object.entries(this.session.retrieve(NxConfigService.OVERRIDE_KEY) || {}).forEach(
            ([nodesString, value]) => {
                const nodes = nodesString.split('.');
                const property = nodes.pop();
                const target = findNode(config, nodes);
                target[property] = value;
            },
        );
    }

    getConfig(): IConfig {
        return this.config;
    }

    static get isDarkTheme(): boolean {
        return nxConfig.isDarkTheme;
    }

    static set isDarkTheme(res: boolean) {
        nxConfig.isDarkTheme = res;
        this.configChanged.next(true);
    }
}
