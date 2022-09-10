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
        private self: ElementRef,
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'colors';
        this.menuService.detail = 'themeHSL';

        this.rs = getComputedStyle(this.self.nativeElement as HTMLElement);

        this.brand.hue = this.rs.getPropertyValue('--color-h');
        this.brand.saturation = this.rs.getPropertyValue('--color-s');
        this.brand.luminosity = this.rs.getPropertyValue('--color-l');
    }

    setHue(event: Event): void {
        // @ts-expect-error value not part
        this.brand.hue = event.target.value;
        this.self.nativeElement.style.setProperty('--color-h', this.brand.hue);
    }

    setSaturation(event: Event): void {
        // @ts-expect-error value not part
        this.brand.saturation = event.target.value;
        this.self.nativeElement.style.setProperty('--color-s', this.brand.saturation);
    }

    setLuminosity(event: Event): void {
        // @ts-expect-error value not part
        this.brand.luminosity = event.target.value;
        this.self.nativeElement.style.setProperty('--color-l', this.brand.luminosity);
    }
}
