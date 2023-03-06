import { Component, Inject, ViewEncapsulation } from '@angular/core';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxThemeService } from '@services/theme.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-auth-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
    constructor(
        @Inject(WINDOW) private window: Window,
        private configService: NxConfigService,
        private themeService: NxThemeService,
    ) {
        const CONFIG = this.configService.getConfig();
        if (CONFIG.featureFlags.themesEnabled) {
            this.themeService.initTheme().then(
                () => {}, // weird Safari 12
                () => {}
            );
        } else {
            this.window.document.documentElement.setAttribute('data-theme', CONFIG.themeConfig.light);
        }
    }
}
