import {
    Component,
    Input,
    OnInit,
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { Account } from '@services/account.service/account';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxThemeService } from '@services/theme.service';

@Component({
    selector: 'nx-theme-switcher-component',
    styleUrls: ['./theme-switcher.component.scss'],
    templateUrl: './theme-switcher.component.html',
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout: string = 'extended';
    @Input() account: Account;

    CONFIG: IConfig;
    LANG = staticLang;

    selectedTheme: string;

    constructor(
        configService: NxConfigService,
        public themeService: NxThemeService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.selectedTheme = this.themeService.getTheme();
    }

    setTheme(name: string | null): void {
        this.themeService.setTheme(name, this.account?.email);
        this.selectedTheme = name;
    }
}
