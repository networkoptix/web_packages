import { Component, ViewEncapsulation } from '@angular/core';

import { nxConfig } from '@services/nx-config/config';
import { NxThemeService } from '@services/theme.service';

@Component({
    selector: 'nx-auth-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
    constructor(private themeService: NxThemeService) {
        if (nxConfig.featureFlags.themesEnabled) {
            this.themeService.initTheme().then(
                () => {}, // weird Safari 12
                () => {},
            );
        }
    }
}
