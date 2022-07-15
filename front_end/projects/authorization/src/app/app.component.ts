import { Component } from '@angular/core';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxThemeService } from '@services/theme.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    constructor(
        private configService: NxConfigService,
        private themeService: NxThemeService,
    ) {
        if (this.configService.getConfig().featureFlags.themesEnabled) {
            this.themeService.initTheme();
        }
    }
}
