import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '../../../menu/menu.service';

@Component({
    selector: 'nx-hsl-theme-colors',
    templateUrl: 'theme-colors.component.html',
    styleUrls: ['theme-colors.component.scss']
})
export class NxHSLThemeColorsComponent implements OnInit {
    brand = {
        hue: '',
        saturation: '',
        luminosity: '',
    };
    rs: CSSStyleDeclaration;

    @ViewChild('frmTheme', { static: true }) public frmTheme: NgForm;

    constructor(
        private self: ElementRef<HTMLElement>,
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'colors';
        this.menuService.detail = 'themeHSL';

        this.rs = getComputedStyle(this.self.nativeElement);

        this.brand.hue = this.rs.getPropertyValue('--color-h');
        this.brand.saturation = this.rs.getPropertyValue('--color-s');
        this.brand.luminosity = this.rs.getPropertyValue('--color-l');
    }

    setHue(event: KeyboardEvent): void {
        this.brand.hue = (event.target as HTMLInputElement).value;
        this.self.nativeElement.style.setProperty('--color-h', this.brand.hue);
    }

    setSaturation(event: KeyboardEvent): void {
        this.brand.saturation = (event.target as HTMLInputElement).value;
        this.self.nativeElement.style.setProperty('--color-s', this.brand.saturation);
    }

    setLuminosity(event: KeyboardEvent): void {
        this.brand.luminosity = (event.target as HTMLInputElement).value;
        this.self.nativeElement.style.setProperty('--color-l', this.brand.luminosity);
    }
}
