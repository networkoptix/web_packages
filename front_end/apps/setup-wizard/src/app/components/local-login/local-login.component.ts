import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-local-login',
    templateUrl: './local-login.component.html',
    styleUrls: ['./local-login.component.scss']
})
export class LocalLoginComponent implements OnInit {
    get password(): string {
        return this.wizardService.setupConfig.localPassword;
    }
    set password(password: string) {
        this.wizardService.setupConfig.localPassword = password;
    }

    get confirmedPassword(): string {
        return this.wizardService.setupConfig.localPasswordConfirmation;
    }

    set confirmedPassword(password: string) {
        this.wizardService.setupConfig.localPasswordConfirmation = password;
    }

    constructor(public wizardService: WizardStateService) { }

    ngOnInit(): void {
    }
}
