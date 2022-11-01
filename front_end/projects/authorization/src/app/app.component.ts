import { Component, ViewEncapsulation } from '@angular/core';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxThemeService } from '@services/theme.service';

@Component({
    selector: 'nx-auth-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AppComponent {
    constructor(
        private configService: NxConfigService,
        private themeService: NxThemeService,
    ) {
        if (this.configService.getConfig().featureFlags.themesEnabled) {
            this.themeService.initTheme().then();
        }
    }
}
