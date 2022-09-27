import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'app-local-success',
    templateUrl: './local-success.component.html',
    styleUrls: ['./local-success.component.scss']
})
export class LocalSuccessComponent implements OnInit {
    address: string;
    username: string;

    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
        const { ip, port } = this.wizardService.networkInfo;
        this.address = `${ip}:${port}`;
        this.username = this.wizardService.setupConfig.localLogin;
    }
}
