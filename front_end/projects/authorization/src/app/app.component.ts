import { Component, Inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    constructor(
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) private window: Window,
    ) {
        if (this.localStorageService.retrieve('theme') === 'dark') {
            this.window.document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}
