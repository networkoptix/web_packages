import {
    Component,
    Input,
    OnInit,
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { images } from '@lib/variables/static-variables';
import { Account } from '@services/account.service/account';
import { NxThemeService } from '@services/theme.service';

@Component({
    selector: 'nx-theme-switcher-component',
    styleUrls: ['./theme-switcher.component.scss'],
    templateUrl: './theme-switcher.component.html',
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout: string = 'extended';
    @Input() account: Account;

    LANG = staticLang;
    images = images;

    selectedTheme: string;

    constructor(
        private themeService: NxThemeService,
    ) {
    }

    ngOnInit(): void {
        this.selectedTheme = this.themeService.getTheme();
    }

    setTheme(name: string | null): void {
        this.themeService.setTheme(name, this.account?.email);
        this.selectedTheme = name;
    }
}
