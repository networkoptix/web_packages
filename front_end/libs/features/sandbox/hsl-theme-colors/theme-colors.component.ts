import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '@app/menu/menu.service';

@Component({
    selector: 'nx-hsl-theme-colors',
    templateUrl: 'theme-colors.component.html',
    styleUrls: ['theme-colors.component.scss'],
})
export class NxHSLThemeColorsComponent implements OnInit {
    backgroundColor: string;
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
    luminosityStep: number;
    rs: CSSStyleDeclaration;

    colorNumbers: Array<number>;
    hexLight: Array<string> = [];
    hexDark: Array<string> = [];
    hexError: Array<Record<string, string>> = [];
    hexGreen: Array<Record<string, string>> = [];
    hexYellow: Array<Record<string, string>> = [];
    hexBrand: Array<Record<string, string>> = [];

    @ViewChild('frmTheme', { static: true }) public frmTheme: NgForm;
    @ViewChild('brandInput', { static: true }) public brandInput: ElementRef<HTMLInputElement>;
    @ViewChild('colorInput', { static: true }) public colorInput: ElementRef<HTMLInputElement>;
    @ViewChild('backgroundInput', { static: true }) public backgroundInput: ElementRef<HTMLInputElement>;

    constructor(private self: ElementRef<HTMLElement>, private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.section = 'colors';
        this.menuService.detail = 'themeHSL';

        this.rs = getComputedStyle(this.self.nativeElement);

        this.backgroundColor = this.rs.getPropertyValue('--new-body-bg');

        this.brand.hue = parseInt(this.rs.getPropertyValue('--brand-h'));
        this.brand.saturation = parseInt(this.rs.getPropertyValue('--brand-s'));
        this.brand.luminosity = parseInt(this.rs.getPropertyValue('--brand-l'));

        this.color.hue = parseInt(this.rs.getPropertyValue('--color-h'));
        this.color.saturation = parseInt(this.rs.getPropertyValue('--color-s'));
        this.color.luminosity = parseFloat(this.rs.getPropertyValue('--color-l'));

        this.luminosityStep = parseFloat(this.rs.getPropertyValue('--color-l-step'));

        this.colorNumbers = Array.from(Array(20), (_, i) => i);
        this.colorNumbers.shift();

        this.calcHexBaseColors();
        this.setColors();

        this.setBackgroundInput();
    }

    setBackgroundInput(): void {
        this.backgroundInput.nativeElement.value = this.hslToHex(
            this.toHSLObject(this.rs.getPropertyValue('--new-body-bg'))
        ).toUpperCase();
    }

    setBrandInput(): void {
        this.brandInput.nativeElement.value = this
            .hslToHex({ h: this.brand.hue, s: this.brand.saturation, l: this.brand.luminosity })
            .toUpperCase();

        this.setColorHue(this.brand.hue);
        this.setColorSaturation(this.brand.saturation);

        this.calcHexBaseColors();
    }

    setBrandHue(value: number): void {
        this.brand.hue = +value;
        this.self.nativeElement.style.setProperty('--brand-h', `${this.brand.hue}`);
        this.setBrandInput();
        this.setColors();
    }

    setBrandSaturation(value: number): void {
        this.brand.saturation = +value;
        this.self.nativeElement.style.setProperty('--brand-s', `${this.brand.saturation}%`);
        this.setBrandInput();
        this.setColors();
    }

    setBrandLuminosity(value: number): void {
        this.brand.luminosity = +value;
        this.self.nativeElement.style.setProperty('--brand-l', `${this.brand.luminosity}%`);
        this.setBrandInput();
        this.setColors();
    }

    setColorHue(value: number): void {
        this.color.hue = value;
        this.self.nativeElement.style.setProperty('--color-h', `${this.color.hue}`);
    }

    setColorSaturation(value: number): void {
        this.color.saturation = value;
        this.self.nativeElement.style.setProperty('--color-s', `${this.color.saturation}%`);
    }

    // setColorLuminosity(value: number): void {
    //     this.color.luminosity = value;
    //     this.self.nativeElement.style.setProperty('--color-l', `${this.color.luminosity}%`);
    // }

    setColorLuminosityStep(value: number): void {
        this.luminosityStep = value;
        this.self.nativeElement.style.setProperty('--color-l-step', `${this.luminosityStep}%`);
    }

    hexToHSL(hex: string): Record<string, number> {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        let r = parseInt(result[1], 16);
        let g = parseInt(result[2], 16);
        let b = parseInt(result[3], 16);
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b); const min = Math.min(r, g, b);
        let h: number;
        let s: number;
        const l = (max + min) / 2;
        if (max === min) {
            h = 0;
            s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            hue: Math.round(h * 360),
            sat: Math.round(s * 100),
            lum: Math.round(l * 100)
        };
    }

    hslToHex(hsl: { h: number; s: number; l: number }): string {
        const { h, s, l } = hsl;

        const hDecimal = l / 100;
        const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
        const f = (n: number): string => {
            const k = (n + h / 30) % 12;
            const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

            // Convert to Hex and prefix with "0" if required
            return Math.round(255 * color)
                .toString(16)
                .padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    toHSLObject = (hslStr: string): { s: number; h: number; l: number } => {
        const hs = hslStr.substring(0, hslStr.indexOf('calc'));
        // eslint-disable-next-line no-eval
        const l = eval(hslStr.match(/[\d%\s-+*.]+/g)[4].replace(/%/g, ''));
        const [h, s] = hs.match(/\d+/g).map(Number);
        return { h, s, l };
    };

    calcHexBaseColors(): void {
        for (const num of this.colorNumbers) {
            const colorA = this.toHSLObject(this.rs.getPropertyValue('--new-light' + num));
            this.hexLight[num] = this.hslToHex(colorA).toUpperCase();

            const colorB = this.toHSLObject(this.rs.getPropertyValue('--new-dark' + num));
            this.hexDark[num] = this.hslToHex(colorB).toUpperCase();
        }
    }

    calcErrorColors(): void {
        const availErrorColors = ['dark', 'core', 'light'];
        for (const idx in availErrorColors) {
            this.hexError[idx] = {
                label: availErrorColors[idx],
                hex: this.hslToHex(
                    this.toHSLObject(this.rs.getPropertyValue('--new-error-' + availErrorColors[idx]))
                ).toUpperCase()
            };
        }
    }

    calcGreenColors(): void {
        const availGreenColors = ['dark', 'core', 'light'];
        for (const idx in availGreenColors) {
            this.hexGreen[idx] = {
                label: availGreenColors[idx],
                hex: this.hslToHex(
                    this.toHSLObject(this.rs.getPropertyValue('--new-green-' + availGreenColors[idx]))
                ).toUpperCase()
            };
        }
    }

    calcYellowColors(): void {
        const availYellowColors = ['dark', 'core', 'light'];
        for (const idx in availYellowColors) {
            this.hexYellow[idx] = {
                label: availYellowColors[idx],
                hex: this.hslToHex(
                    this.toHSLObject(this.rs.getPropertyValue('--new-yellow-' + availYellowColors[idx]))
                ).toUpperCase()
            };
        }
    }

    calcBrandColors(): void {
        const availBrandColors = ['l4', 'l3', 'l2', 'l1', 'core', 'd1', 'd2', 'd3', 'd4', 'd5'];
        for (const idx in availBrandColors) {
            this.hexBrand[idx] = {
                label: availBrandColors[idx],
                hex: this.hslToHex(
                    this.toHSLObject(this.rs.getPropertyValue('--new-brand-' + availBrandColors[idx]))
                ).toUpperCase()
            };
        }
    }

    setColors(): void {
        this.calcErrorColors();
        this.calcGreenColors();
        this.calcYellowColors();
        this.calcBrandColors();
    }

    changeBrandColor(event: KeyboardEvent): void {
        const value = (event.target as HTMLInputElement).value;
        if (value.startsWith('#') && value.length === 7) {
            const { hue, sat, lum } = this.hexToHSL(value);
            this.setBrandHue(hue);
            this.setBrandSaturation(sat);
            this.setBrandLuminosity(lum);

            this.setColors();

            this.setColorHue(hue);
            this.setColorSaturation(sat);

            this.calcHexBaseColors();
        }
    }

    changeBaseColor(event: KeyboardEvent): void {
        const value = (event.target as HTMLInputElement).value;
        if (value.startsWith('#') && value.length === 7) {
            const { hue, sat } = this.hexToHSL(value);
            this.setColorHue(hue);
            this.setColorSaturation(sat);
            // this.setBrandLuminosity(lum);
        }
    }

    setBackground(hex: string): void {
        const { hue, sat, lum } = this.hexToHSL(hex);
        this.self.nativeElement.style.setProperty('--background-h', `${hue}`);
        this.self.nativeElement.style.setProperty('--background-s', `${sat}%`);
        this.self.nativeElement.style.setProperty('--background-l', `${lum}%`);
    }

    changeBackgroundColor(event: KeyboardEvent): void {
        const value = (event.target as HTMLInputElement).value.trim();
        if (value.startsWith('#') && value.length === 7) {
            this.setBackground(value);
        }
    }
}
