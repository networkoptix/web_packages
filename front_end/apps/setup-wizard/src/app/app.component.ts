import { Component, OnInit } from '@angular/core';

import { NxThemeService } from '@services/theme.service';

import { WizardStateService } from './services/wizard-state.service';

require('what-input');

@Component({
    selector: 'nx-setupwizard-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    constructor(
        private themeService: NxThemeService,
        private wizardState: WizardStateService,
    ) {
    }

    ngOnInit(): void {
        const theme = this.wizardState.hasNativeClient ? 'dark' : 'light';
        this.themeService.setTheme(theme, 'setup');
    }
}
