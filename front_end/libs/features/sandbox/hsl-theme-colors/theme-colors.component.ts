import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '@app/menu/menu.service';

@Component({
    selector: 'nx-hsl-theme-colors',
    templateUrl: 'theme-colors.component.html',
    styleUrls: ['theme-colors.component.scss']
})
export class NxHSLThemeColorsComponent implements OnInit {
    brand = {
        hue: 0,
        saturation: 0,
        luminosity: 0,
    };
    color = {
        hue: 0,
        saturation: 0,
        luminosity: null, // set to +5%
    };
    rs: CSSStyleDeclaration;

    @ViewChild('frmTheme', { static: true }) public frmTheme: NgForm;

    constructor(
        private self: ElementRef<HTMLElement>,
        private menuService: NxMenuService,
    ) { }

    ngOnInit(): void {
        this.menuService.section = 'colors';
        this.menuService.detail = 'themeHSL';

        this.rs = getComputedStyle(this.self.nativeElement);

        this.brand.hue = parseInt(this.rs.getPropertyValue('--brand-h'));
        this.brand.saturation = parseInt(this.rs.getPropertyValue('--brand-s'));
        this.brand.luminosity = parseInt(this.rs.getPropertyValue('--brand-l'));

        this.color.hue = parseInt(this.rs.getPropertyValue('--color-h'));
        this.color.saturation = parseInt(this.rs.getPropertyValue('--color-s'));
        this.color.luminosity = parseInt(this.rs.getPropertyValue('--color-l'));
    }

    setBrandHue(value: number): void {
        this.brand.hue = value;
        this.self.nativeElement.style.setProperty('--brand-h', `${this.brand.hue}`);
    }

    setBrandSaturation(value: number): void {
        this.brand.saturation = value;
        this.self.nativeElement.style.setProperty('--brand-s', `${this.brand.saturation}%`);
    }

    setBrandLuminosity(value: number): void {
        this.brand.luminosity = value;
        this.self.nativeElement.style.setProperty('--brand-l', `${this.brand.luminosity}%`);
    }

    setColorHue(value: number): void {
        this.color.hue = value;
        this.self.nativeElement.style.setProperty('--color-h', `${this.color.hue}`);
    }

    setColorSaturation(value: number): void {
        this.color.saturation = value;
        this.self.nativeElement.style.setProperty('--color-s', `${this.color.saturation}%`);
    }

    setColorLuminosity(value: number): void {
        this.color.luminosity = value;
        this.self.nativeElement.style.setProperty('--color-l', `${this.color.luminosity}%`);
    }
}
