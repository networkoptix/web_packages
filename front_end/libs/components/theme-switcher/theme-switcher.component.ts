import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import staticLang from '@language_static';
import { Account } from '@services/account.service/account';
import { NxThemeService } from '@services/theme.service';
import { images } from '@static-variables';

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
    ],
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout: string = 'extended';
    @Input() account: Account;

    LANG = staticLang;
    images = images;

    selectedTheme: string;

    constructor(public themeService: NxThemeService) {}

    ngOnInit(): void {
        this.selectedTheme = this.themeService.getTheme();
    }

    setTheme(name: string | null): void {
        this.themeService.setTheme(name, this.account?.email);
        this.selectedTheme = name;
    }
}
