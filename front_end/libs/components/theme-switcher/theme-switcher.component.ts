import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { isEqual } from 'lodash-es';
import { ColorPickerModule } from 'ngx-color-picker';
import {
    NEVER,
    Subject,
    debounceTime,
    distinctUntilChanged,
    firstValueFrom,
    scan,
    shareReplay,
    startWith,
    switchMap,
} from 'rxjs';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxLabelComponent } from '@components/forms/label/label.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { Account } from '@services/account.service/account';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxThemeService } from '@services/theme.service';
import { images } from '@static-variables';
import {
    HexString,
    NxThemeProviderService,
    ThemeColors,
    ThemeDefinition,
    ThemeOptions,
} from 'nx-components';

type ThemePreset = {
    name: string;
    options: ThemeOptions;
    theme: Partial<ThemeDefinition>;
};

const bgBlue = '#53707f';
const bgGray = '#808080';

const blue = '#2FA2DB';
const green = '#A6CC46';
const orange = '#FC6C21';
const white = '#FFFFFF';

const darkblueCustomization = {
    brandBg: bgBlue,
    brand: blue,
} as const;

const grayWhiteCustomization = {
    brandBg: bgGray,
    brand: white,
} as const;

const darkOrangeCustomization = {
    brand: orange,
    brandBg: bgBlue,
} as const;

const grayOrangeCustomization = {
    brand: orange,
    brandBg: bgGray,
} as const;

const darkGreenCustomization = {
    brand: green,
    brandBg: bgBlue,
} as const;

const hct10 = {
    coreSaturation: 10,
    offset: 0,
    useHct: true,
} as const;

const themePresets: ThemePreset[] = [
    {
        name: 'Custom',
        options: {},
        theme: {},
    },
    {
        name: 'From Customization',
        options: {},
        theme: nxConfig.themeColors,
    },
    {
        name: 'Dark Blue',
        options: {
            coreSaturation: 20,
            offset: 0,
            useHct: false,
        },
        theme: darkblueCustomization,
    },
    {
        name: 'Dark Blue - HCT Saturation 10',
        options: hct10,
        theme: darkblueCustomization,
    },
    {
        name: 'Gray White',
        options: {
            coreSaturation: 0,
            offset: 0,
            useHct: false,
        },
        theme: grayWhiteCustomization,
    },
    {
        name: 'Dark Orange',
        options: {
            coreSaturation: 20,
            offset: 0,
            useHct: false,
        },
        theme: darkOrangeCustomization,
    },
    {
        name: 'Dark Orange - HCT Saturation 10',
        options: hct10,
        theme: darkOrangeCustomization,
    },
    {
        name: 'Gray Orange',
        options: {
            coreSaturation: 20,
            offset: 0,
            useHct: false,
        },
        theme: grayOrangeCustomization,
    },
    {
        name: 'Gray Orange - HCT Saturation 10',
        options: hct10,
        theme: grayOrangeCustomization,
    },
    {
        name: 'Dark Green',
        options: {
            coreSaturation: 20,
            offset: 0,
            useHct: false,
        },
        theme: darkGreenCustomization,
    },
    {
        name: 'Dark Green - HCT Saturation 10',
        options: hct10,
        theme: darkGreenCustomization,
    },
];

@Component({
    selector: 'nx-theme-switcher-component',
    styleUrls: ['./theme-switcher.component.scss'],
    templateUrl: './theme-switcher.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NxContentBlockSectionComponent,
        NxContentBlockComponent,
        NxRadioComponent,
        NxAddSvgSrcDirective,
        TranslateModule,
        NxCheckboxComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxLabelComponent,
        PipesModule,
        ColorPickerModule,
    ],
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout: string = 'extended';
    @Input() account: Account;

    LANG = staticLang;
    images = images;
    useNewColors = nxConfig.featureFlags.newCloudColorProvider;
    themeProvider = inject(NxThemeProviderService);
    unmappedColors$$ = inject(NxConfigService).unmappedColors$$;
    presets = themePresets;
    selectedPreset$$ = signal(
        (() => {
            try {
                const { name } = JSON.parse(localStorage.getItem('newThemeConfig') || '{}');
                return name || 'Custom';
            } catch {
                return 'Custom';
            }
        })(),
    );

    customOptions$$ = signal<ThemeOptions>({}, { equal: isEqual });

    customDisabled$$ = computed(() => this.selectedPreset$$() !== 'Custom');

    updateCustomOptions = (options: ThemeOptions): void => {
        this.customOptions$$.update(current => ({ ...current, ...options }));
    };

    customThemeColor$ = new Subject<Partial<ThemeDefinition>>();
    selectedPreset$ = toObservable(this.selectedPreset$$);
    customTheme$ = this.customThemeColor$.pipe(
        scan((acc, value) => ({ ...acc, ...value }), {} as Partial<ThemeDefinition>),
        startWith({}),
        debounceTime(250),
        switchMap(theme =>
            this.selectedPreset$.pipe(
                switchMap(preset => {
                    if (preset !== 'Custom') {
                        const presetTheme = this.presets.find(({ name }) => name === preset)?.theme;

                        if (presetTheme && Object.keys(presetTheme).length) {
                            return Promise.resolve(presetTheme);
                        }
                        return NEVER;
                    }

                    return Promise.resolve(theme);
                }),
            ),
        ),
        distinctUntilChanged((a, b) => isEqual(a, b)),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    customTheme$$ = toSignal(this.customTheme$, { initialValue: {} as Partial<ThemeDefinition> });

    updateThemeColor = (color: ThemeColors, value: HexString): void => {
        this.customThemeColor$.next({ [color]: value });
    };

    customizePreset = (): void => {
        const presetName = this.selectedPreset$$();
        const preset = this.presets.find(p => p.name === presetName)!;
        this.customThemeColor$.next(preset.theme);
        this.customOptions$$.set(preset.options);
        this.selectedPreset$$.set('Custom');
    };

    saveTheme = async (): Promise<void> => {
        const theme = await firstValueFrom(this.customTheme$.pipe(debounceTime(500)));
        const name = this.selectedPreset$$();
        const options = this.customOptions$$();
        localStorage.setItem('newThemeConfig', JSON.stringify({ name, theme, options }));
    };

    syncCustomOptions = effect(
        () => {
            const preset = this.selectedPreset$$();
            const custom = this.customOptions$$();
            const customOptions = custom.useHct
                ? { coreSaturation: 2 as typeof custom.coreSaturation, ...custom }
                : custom;
            const updatedOptions =
                preset === 'Custom'
                    ? customOptions
                    : this.presets.find(p => p.name === preset)?.options;

            this.themeProvider.updateThemeOptions({
                ...themePresets[0].options,
                ...updatedOptions,
            });
            this.saveTheme();
        },
        { allowSignalWrites: true },
    );

    selectedTheme: string | null;

    constructor(public themeService: NxThemeService) {
        this.customTheme$.subscribe(theme => {
            this.themeProvider.updateThemeColor(theme);
            this.saveTheme();
        });
    }

    ngOnInit(): void {
        this.selectedTheme = this.themeService.getTheme();
    }

    setTheme(name: string | null): void {
        this.themeService.setTheme(name, this.account?.email);
        this.selectedTheme = name;
    }
}
