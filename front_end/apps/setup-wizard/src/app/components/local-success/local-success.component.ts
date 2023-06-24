import { Component, OnInit } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-local-success',
    templateUrl: './local-success.component.html',
    styleUrls: ['./local-success.component.scss'],
})
export class LocalSuccessComponent implements OnInit {
    address: string;
    username: string;

    icons = icons;

    constructor(private wizardService: WizardStateService) {}

    ngOnInit(): void {
        const { ip, port } = this.wizardService.networkInfo;
        this.address = `${ip}:${port}`;
        this.username = this.wizardService.setupConfig.localLogin;
    }
}
