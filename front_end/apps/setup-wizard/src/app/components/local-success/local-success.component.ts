import { Component, OnInit } from '@angular/core';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-local-success',
    templateUrl: './local-success.component.html',
    styleUrls: ['./local-success.component.scss']
})
export class LocalSuccessComponent implements OnInit {
    address: string;
    username: string;

    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private wizardService: WizardStateService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        const { ip, port } = this.wizardService.networkInfo;
        this.address = `${ip}:${port}`;
        this.username = this.wizardService.setupConfig.localLogin;
    }
}
