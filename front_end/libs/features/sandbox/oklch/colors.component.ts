import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toGamut, formatCss, converter, differenceEuclidean } from 'culori';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxMenuService } from '@menu/menu.service';

@Component({
    selector: 'nx-oklch-colors',
    templateUrl: 'colors.component.html',
    styleUrls: ['colors.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NxSwitchComponent, NxCheckboxComponent],
})
export class NxOklchColorsComponent implements OnInit {
    showPlus90 = false;
    showPlus180 = false;
    isDarkTheme = false;

    selectedColor: string;
    selected: number;

    palette = 'HSL';
    hue = 0;
    fixedChroma = 40; // 0.4 in oklch
    schemas: {
        paletteArray: { css: string; text: string; lightness: number }[][];
        label: string;
    }[] = [];
    shadeHSLIdx: number | undefined = 5;
    shadeOKLCHIdx: number | undefined = 5;

    pageStyle: string;
    inputTextColor: string;
    inputBgColor: string;

    shades = [...Array.from({ length: 40 }).map((_, i) => 25 + i * 25)];
    lightness = [...Array.from({ length: 40 }).map((_, i) => 98 - i * 2)];
    chroma = [
        0.0108, 0.0321, 0.0609, 0.0908, 0.1398, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472,
        0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472,
        0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472, 0.1472,
        0.1472, 0.1472, 0.1299, 0.1067, 0.0898, 0.0726, 0.054,
    ];

    maxChroma = (i: number, hue: number): { css: string; text: string; lightness: number } => {
        const oklch = converter('oklch');
        const color = `oklch(${this.lightness[i]}% ${this.fixedChroma / 100} ${hue})`;
        const textColorIdx = i <= 18 ? 38 : 1; // second and second to last colors
        return {
            // @ts-expect-error differenceEuclidean()
            css: formatCss(oklch(toGamut('p3', 'oklch', differenceEuclidean('oklch'), 0)(color))),
            text: `oklch(${this.lightness[textColorIdx]}% ${this.chroma[textColorIdx]} ${hue})`,
            lightness: this.lightness[i],
        };
    };

    consistentChroma = (
        i: number,
        hue: number,
    ): { css: string; text: string; lightness: number } => {
        const oklch = converter('oklch');
        const color = `oklch(${this.lightness[i]}% ${this.chroma[i]} ${hue})`;
        const textColorIdx = i <= 18 ? 38 : 1; // second and second to last colors
        return {
            // @ts-expect-error differenceEuclidean()
            css: formatCss(oklch(toGamut('p3', 'oklch', differenceEuclidean('oklch'), 0)(color))),
            text: `oklch(${this.lightness[textColorIdx]}% ${this.chroma[textColorIdx]} ${hue})`,
            lightness: this.lightness[i],
        };
    };

    asHsl = (i: number, hue: number): { css: string; text: string; lightness: number } => {
        const textColorIdx = i <= 18 ? 38 : 1; // second and second to last colors
        return {
            css: `hsl(${hue} 90% ${this.lightness[i]}%)`,
            text: `oklch(${this.lightness[textColorIdx]}% ${this.chroma[textColorIdx]} ${hue})`,
            lightness: this.lightness[i],
        };
    };

    palettes = [
        { fn: this.asHsl, label: 'HSL' },
        { fn: this.maxChroma, label: 'OKLCH (Fixed chroma)' },
        { fn: this.consistentChroma, label: 'OKLCH (Max consistency | dynamic chroma)' },
    ];

    constructor(private menuService: NxMenuService) {
        this.generateAllPalettes();
    }

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('colors');
        this.menuService.selectedDetailsSection$$.set('oklchColors');
    }

    calculatePalette(
        hue: number,
        colorFn: (arg0: number, arg1: number) => { css: string; text: string; lightness: number },
    ): { css: string; text: string; lightness: number }[] {
        return this.shades.map((_, i) => colorFn(i, hue));
    }

    generateAllPalettes(): void {
        this.schemas = this.palettes.map(({ fn, label }) => ({
            paletteArray: [
                this.calculatePalette(this.hue, fn),
                this.showPlus90 ? this.calculatePalette(this.hue + 90, fn) : [],
                this.showPlus180 ? this.calculatePalette(this.hue + 180, fn) : [],
            ],
            label,
        }));
    }

    setShade(palette: string, idx: number): void {
        this.palette = palette;
        this.selected = idx;
        this.selectedColor = idx > 18 ? 'white' : 'black';
        const textColorIdx = idx <= 18 ? 38 : 1;

        if (palette === 'HSL') {
            this.shadeHSLIdx = idx;
            this.shadeOKLCHIdx = undefined;
            this.inputTextColor = `hsl(${this.hue} 90% ${this.lightness[textColorIdx]}%)`;
            this.inputBgColor = `hsl(${this.hue} 90% ${this.lightness[this.shadeHSLIdx]}%)`;
            this.pageStyle = `hsl(${this.hue} 40% ${this.lightness[5]}%)`;
        } else {
            this.shadeHSLIdx = undefined;
            this.shadeOKLCHIdx = idx;
            this.inputTextColor = `oklch(${this.lightness[textColorIdx]}% ${this.chroma[textColorIdx]} ${this.hue})`;
            this.inputBgColor = `oklch(${this.lightness[this.shadeOKLCHIdx]}% ${this.chroma[this.shadeOKLCHIdx]} ${this.hue})`;
            this.pageStyle = `oklch(${this.lightness[2]}% ${this.chroma[this.shadeOKLCHIdx]} ${this.hue})`;
        }
    }
}
