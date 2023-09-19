import { DOCUMENT, CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    Input,
    OnInit,
    ViewChild,
    ViewEncapsulation,
    booleanAttribute,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PrimaryButtonModule } from '@components/primary-button/primary-button.module';
import { NxThemeSwitcherComponent } from '@components/theme-switcher/theme-switcher.component';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxSessionService } from '@services/session.service';
import { NxThemeService } from '@services/theme.service';

@UntilDestroy()
@Component({
    selector: 'nx-theme-generator',
    templateUrl: 'theme-colors.component.html',
    styleUrls: ['theme-colors.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxCheckboxComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxGenericDropdownModule,
        NxThemeSwitcherComponent,
        PrimaryButtonModule,
    ],
})
export class NxThemeGeneratorComponent implements OnInit, AfterViewInit {
    @Input({ alias: 'advanced', transform: booleanAttribute }) advanced: boolean;
    @Input('generatorLayout') generatorLayout: string = 'general';

    LANG = staticLang;

    colorLuminosity = {
        l4: 1.6,
        l3: 1.5,
        l2: 1.3,
        l1: 1.1,
        core: 1,
        d1: 0.9,
        d2: 0.7,
        d3: 0.5,
        d4: 0.3,
        d5: 0.2,
    };
    background = {
        hue: 0,
        saturation: 0,
        luminosity: 0,
    };
    brand = {
        hue: 0,
        saturation: 0,
        luminosity: 0,
    };
    color = {
        hue: 0,
        saturation: 0,
        luminosity: 0, // set to +5%
    };
    backgroundHEXValue: string;
    isHSLTheme: boolean = false;
    isLiteTheme: boolean = false;
    isWidgetShown: boolean = false;
    luminosityStep: number;
    rs: CSSStyleDeclaration;
    scope: HTMLElement;

    colorNumbers: Array<number>;
    hexLight: Array<string> = [];
    // hexAdditionalLight: Array<string> = [];
    hexDark: Array<string> = [];
    hexError: Array<Record<string, string>> = [];
    hexGreen: Array<Record<string, string>> = [];
    hexYellow: Array<Record<string, string>> = [];
    hexBrand: Array<Record<string, string>> = [];
    colorLum: Array<Record<string, string>> = [];

    showDisclaimer: boolean = true;
    showColorOutOfBoundaries: boolean = true;

    @ViewChild('frmTheme', { static: false }) frmTheme: NgForm;
    @ViewChild('brandInput', { static: false }) brandInput: ElementRef<HTMLInputElement>;
    @ViewChild('colorInput', { static: false }) colorInput: ElementRef<HTMLInputElement>;
    @ViewChild('backgroundInput', { static: false }) backgroundInput: ElementRef<HTMLInputElement>;

    constructor(
        private sessionService: NxSessionService,
        private menuService: NxMenuService,
        public themeService: NxThemeService,
        @Inject(DOCUMENT) protected document: Document,
    ) {}

    ngOnInit(): void {
        this.menuService.selectedSection.set('colors');
        this.menuService.selectedDetailsSection.set('themeHSL');

        this.scope = this.document.documentElement;

        this.isHSLTheme = this.themeService.isHSLTheme();
        this.isLiteTheme = this.scope.getAttribute('data-theme-mode') === 'light';
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            if (this.isHSLTheme) {
                this.initColors();
            }
        });
    }

    initColors(): void {
        this.rs = getComputedStyle(this.scope);

        this.colorLuminosity.l4 = parseFloat(this.rs.getPropertyValue('--color-level-l4'));
        this.colorLuminosity.l3 = parseFloat(this.rs.getPropertyValue('--color-level-l3'));
        this.colorLuminosity.l2 = parseFloat(this.rs.getPropertyValue('--color-level-l2'));
        this.colorLuminosity.l1 = parseFloat(this.rs.getPropertyValue('--color-level-l1'));
        this.colorLuminosity.core = parseFloat(this.rs.getPropertyValue('--color-level-core'));
        this.colorLuminosity.d1 = parseFloat(this.rs.getPropertyValue('--color-level-d1'));
        this.colorLuminosity.d2 = parseFloat(this.rs.getPropertyValue('--color-level-d2'));
        this.colorLuminosity.d3 = parseFloat(this.rs.getPropertyValue('--color-level-d3'));
        this.colorLuminosity.d4 = parseFloat(this.rs.getPropertyValue('--color-level-d4'));
        this.colorLuminosity.d5 = parseFloat(this.rs.getPropertyValue('--color-level-d5'));

        this.background.hue = parseInt(this.rs.getPropertyValue('--background-h'));
        this.background.saturation = parseInt(this.rs.getPropertyValue('--background-s'));
        this.background.luminosity = parseInt(this.rs.getPropertyValue('--background-l'));

        this.brand.hue = parseInt(this.rs.getPropertyValue('--brand-h'));
        this.brand.saturation = parseInt(this.rs.getPropertyValue('--brand-s'));
        this.brand.luminosity = parseInt(this.rs.getPropertyValue('--brand-l'));

        this.color.hue = parseInt(this.rs.getPropertyValue('--color-h'));
        this.color.saturation = parseInt(this.rs.getPropertyValue('--color-s'));
        this.color.luminosity = parseFloat(this.rs.getPropertyValue('--color-l'));

        this.luminosityStep = 2; // parseFloat(this.rs.getPropertyValue('--color-l-step')) || 2;

        this.isLiteTheme = this.themeService.themeMode$.value === 1;

        this.colorNumbers = Array.from(Array(20), (_, i) => i);
        this.colorNumbers.shift();

        this.calcHexBaseColors();
        this.setColors();
        this.setBrandInput();
        this.setBackgroundInput();
        this.setColorInput();
    }

    setError(): void {
        this.showColorOutOfBoundaries =
            this.color.saturation < 30 ||
            this.color.saturation > 70 ||
            this.brand.saturation < 30 ||
            this.brand.saturation > 70 ||
            this.brand.luminosity < 30 ||
            this.brand.luminosity > 70;
        this.showDisclaimer = !this.showColorOutOfBoundaries;
    }

    setBackgroundInput(): void {
        this.backgroundHEXValue = NxThemeService.hslToHex(
            NxThemeService.toHSLObject(this.rs.getPropertyValue('--new-body-bg')),
        ).toUpperCase();
    }

    setColorInput(): void {
        this.setError();
        if (this.colorInput) {
            this.colorInput.nativeElement.value = NxThemeService.hslToHex({
                h: this.color.hue,
                s: this.color.saturation,
                l: this.color.luminosity,
            }).toUpperCase();
        }
    }

    setBrandInput(): void {
        this.setError();
        if (this.brandInput) {
            this.brandInput.nativeElement.value = NxThemeService.hslToHex({
                h: this.brand.hue,
                s: this.brand.saturation,
                l: this.brand.luminosity,
            }).toUpperCase();
            // this.setColorHue(this.brand.hue);
            // this.setColorSaturation(this.brand.saturation);

            this.calcHexBaseColors();
        }
    }

    setBrandHue(value: number): void {
        this.brand.hue = +value;
        this.themeService.setBrandHue(value);
        this.setBrandInput();
        this.setColors();
    }

    setBrandSaturation(value: number): void {
        this.brand.saturation = +value;
        this.themeService.setBrandSaturation(value);
        this.setBrandInput();
        this.setColors();
    }

    setBrandLuminosity(value: number): void {
        this.brand.luminosity = +value;
        this.themeService.setBrandLuminosity(value);
        this.setBrandInput();
        this.setColors();
    }

    adjBrand(): void {
        if (this.brand.saturation < 30) {
            this.brand.saturation = 30;
        } else if (this.brand.saturation > 70) {
            this.brand.saturation = 70;
        }

        if (this.brand.luminosity < 30) {
            this.brand.luminosity = 30;
        } else if (this.brand.luminosity > 70) {
            this.brand.luminosity = 70;
        }
        this.setError();
    }

    adjBaseColor(): void {
        if (this.color.saturation < 30) {
            this.color.saturation = 30;
        } else if (this.color.saturation > 70) {
            this.color.saturation = 70;
        }
        // luminosity is auto generated in steps (2% default)
        this.setError();
    }

    setColorLuminosity(item: Record<string, string>): void {
        this.colorLuminosity[item.label] = parseFloat(item.value);
        this.themeService.setLeverLuminosity(item);
        this.updateStorage();
        this.setColorInput();
    }

    setColorHue(value: number): void {
        this.themeService.setColorHue(value);
        this.updateStorage();
        this.setColorInput();
    }

    setColorSaturation(value: number): void {
        this.themeService.setColorSaturation(value);
        this.updateStorage();
        this.setColorInput();
    }

    setColorLuminosityStep(value: number): void {
        this.themeService.setColorLuminosityStep(value);
        this.updateStorage();
        this.setColorInput();
    }

    calcHexBaseColors(): void {
        for (const num of this.colorNumbers) {
            const colorA = NxThemeService.toHSLObject(
                this.rs.getPropertyValue('--new-light' + num),
            );
            this.hexLight[num] = NxThemeService.hslToHex(colorA).toUpperCase();

            const colorB = NxThemeService.toHSLObject(this.rs.getPropertyValue('--new-dark' + num));
            this.hexDark[num] = NxThemeService.hslToHex(colorB).toUpperCase();
        }
    }

    calcErrorColors(): void {
        const availErrorColors = ['d1', 'core', 'l1'];
        for (const idx in availErrorColors) {
            this.hexError[idx] = {
                label: availErrorColors[idx],
                hex: NxThemeService.hslToHex(
                    NxThemeService.toHSLObject(
                        this.rs.getPropertyValue('--new-error-' + availErrorColors[idx]),
                    ),
                ).toUpperCase(),
            };
        }
    }

    calcGreenColors(): void {
        const availGreenColors = ['d1', 'core', 'l1'];
        for (const idx in availGreenColors) {
            this.hexGreen[idx] = {
                label: availGreenColors[idx],
                hex: NxThemeService.hslToHex(
                    NxThemeService.toHSLObject(
                        this.rs.getPropertyValue('--new-green-' + availGreenColors[idx]),
                    ),
                ).toUpperCase(),
            };
        }
    }

    calcYellowColors(): void {
        const availYellowColors = ['d1', 'core', 'l1'];
        for (const idx in availYellowColors) {
            this.hexYellow[idx] = {
                label: availYellowColors[idx],
                hex: NxThemeService.hslToHex(
                    NxThemeService.toHSLObject(
                        this.rs.getPropertyValue('--new-yellow-' + availYellowColors[idx]),
                    ),
                ).toUpperCase(),
            };
        }
    }

    // calcAdditionalLightColors(): void {
    //     for (let i = 1; i <= 8; i++) {
    //         const color = NxThemeService.toHSLObject(this.rs.getPropertyValue('--new-additional-light' + i));
    //         this.hexAdditionalLight[i] = NxThemeService.hslToHex(color).toUpperCase();
    //     }
    // }

    calcBrandColors(): void {
        const availBrandColors = ['l4', 'l3', 'l2', 'l1', 'core', 'd1', 'd2', 'd3', 'd4', 'd5'];
        for (const idx in availBrandColors) {
            this.hexBrand[idx] = {
                label: availBrandColors[idx],
                hex: NxThemeService.hslToHex(
                    NxThemeService.toHSLObject(
                        this.rs.getPropertyValue('--new-brand-' + availBrandColors[idx]),
                    ),
                ).toUpperCase(),
            };
        }
    }

    calcColorLuminosity(): void {
        const availColorLuminosity = ['l4', 'l3', 'l2', 'l1', 'core', 'd1', 'd2', 'd3', 'd4', 'd5'];
        for (const idx in availColorLuminosity) {
            this.colorLum[idx] = {
                label: availColorLuminosity[idx],
                value: this.rs.getPropertyValue('--color-level-' + availColorLuminosity[idx]),
            };
        }
    }

    updateStorage(): void {
        this.sessionService.hslTheme = {
            'theme-mode': this.isLiteTheme ? 1 : 0,
            'brand-h': this.brand.hue,
            'brand-s': this.brand.saturation,
            'brand-l': this.brand.luminosity,
            'color-h': this.color.hue,
            'color-s': this.color.saturation,
            'color-l': this.color.luminosity,
            'color-l-step': this.luminosityStep,
            'background-h': this.background.hue,
            'background-s': this.background.saturation,
            'background-l': this.background.luminosity,
            'color-level-l4': this.colorLuminosity.l4,
            'color-level-l3': this.colorLuminosity.l3,
            'color-level-l2': this.colorLuminosity.l2,
            'color-level-l1': this.colorLuminosity.l1,
            'color-level-core': this.colorLuminosity.core,
            'color-level-d1': this.colorLuminosity.d1,
            'color-level-d2': this.colorLuminosity.d2,
            'color-level-d3': this.colorLuminosity.d3,
            'color-level-d4': this.colorLuminosity.d4,
            'color-level-d5': this.colorLuminosity.d5,
        };
    }

    setColors(): void {
        // this.calcAdditionalLightColors();
        this.calcErrorColors();
        this.calcGreenColors();
        this.calcYellowColors();
        this.calcBrandColors();
        this.calcColorLuminosity();

        this.updateStorage();
    }

    changeBrandColor(event: KeyboardEvent): void {
        const value = (event.target as HTMLInputElement).value;
        this.changeBColor(value);
    }

    changeBColor(color: string): void {
        if (color.startsWith('#') && color.length === 7) {
            const { hue, sat, lum } = NxThemeService.hexToHSL(color);
            this.themeService.setBrandHue(hue);
            this.themeService.setBrandSaturation(sat);
            this.themeService.setBrandLuminosity(lum);
            this.themeService.setColorHue(hue);
            this.themeService.setColorSaturation(sat);

            this.brand.hue = hue;
            this.brand.saturation = sat;
            this.brand.luminosity = lum;

            this.color.hue = hue;
            this.color.saturation = sat;
            this.color.luminosity = lum;

            this.setColors();
            this.calcHexBaseColors();
        }
    }

    changeBaseColor(event: KeyboardEvent): void {
        const value = (event.target as HTMLInputElement).value;
        this.setBaseColor(value);
    }

    setBaseColor(color: string): void {
        if (color.startsWith('#') && color.length === 7) {
            const { hue, sat } = NxThemeService.hexToHSL(color);
            this.themeService.setColorHue(hue);
            this.themeService.setColorSaturation(sat);
            // this.setBrandLuminosity(lum);
            this.color.hue = hue;
            this.color.saturation = sat;
            // this.color.luminosity = lum;

            this.updateStorage();
        }
    }

    changeBackgroundColor(event: KeyboardEvent): void {
        const value = (event.target as HTMLInputElement).value.trim();
        if (value.startsWith('#') && value.length === 7) {
            const { hue, sat, lum } = NxThemeService.hexToHSL(value);
            this.themeService.setColorsFor('background', {
                'background-h': hue,
                'background-s': sat,
                'background-l': lum,
            });
            this.background.hue = hue;
            this.background.saturation = sat;
            this.background.luminosity = lum;

            this.setColors();
        }
    }

    setWidgetMode(value: boolean): void {
        if (value === undefined) {
            return;
        }

        this.themeService.isWidgetShown$.next(value);
    }

    setThemeMode(value: boolean): void {
        if (value === undefined) {
            return;
        }

        this.isLiteTheme = value;
        this.scope.setAttribute('data-theme-mode', this.isLiteTheme ? 'light' : 'dark');

        this.themeService.themeMode$.next(this.isLiteTheme ? 1 : 0);

        this.initColors();
    }

    setHSLThemeMode(value: boolean): void {
        if (value === undefined) {
            return;
        }

        this.isHSLTheme = value;
        this.scope.setAttribute('data-theme-source', this.isHSLTheme ? 'hsl' : 'default');
        this.themeService.setHSLTheme(value);
        setTimeout(() => {
            if (this.isHSLTheme) {
                this.initColors();
            }
        });
    }

    setBColor(value: string): void {
        this.changeBColor(value);
    }
}
