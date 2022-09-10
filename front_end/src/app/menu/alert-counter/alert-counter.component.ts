import { Component, Input } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Component({
    selector: 'nx-alert-counter',
    templateUrl: './alert-counter.component.html',
    styleUrls: ['./alert-counter.component.scss']
})
export class NxAlertCounter {
    @Input() count: number;
    @Input() type: string;

    CONFIG: IConfig;

    constructor(private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }
}
