import {
    Component,
    Inject,
    Input,
    OnInit,
} from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-theme-switcher-component',
    styleUrls: ['./theme-switcher.component.scss'],
    templateUrl: './theme-switcher.component.html',
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout = 'extended';

    theme : string;

    constructor(
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) protected window: Window,
    ) {}

    ngOnInit() {
        this.theme = this.localStorageService.retrieve('theme');
        NxConfigService.isDarkTheme = this.theme === 'dark';
    }

    setTheme(name) {
        this.theme = name;
        NxConfigService.isDarkTheme = this.theme === 'dark';
        this.localStorageService.store('theme', name);
        this.window.document.documentElement.setAttribute('data-theme', name);
    }
}
