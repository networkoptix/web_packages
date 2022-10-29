import { Component, Inject, OnInit } from '@angular/core';

import { NxThemeService } from '@services/theme.service';
import { WINDOW } from '@services/window-provider';

import { WizardStateService } from './services/wizard-state.service';

@Component({
    selector: 'nx-setupwizard-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    constructor(
        private themeService: NxThemeService,
        private wizardState: WizardStateService,
        @Inject(WINDOW) private window: Window
    ) {
    }

    ngOnInit(): void {
        const inIFrame = this.window.self !== this.window.top;
        const theme = this.wizardState.hasNativeClient || !inIFrame ? 'dark' : 'light';
        this.themeService.setTheme(theme, 'setup');
    }
}
