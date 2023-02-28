import { Component } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Component({
    selector: 'nx-500',
    styleUrls: ['500.component.scss'],
    templateUrl: '500.component.html',
})
export class Nx500Component {
    CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }
}
