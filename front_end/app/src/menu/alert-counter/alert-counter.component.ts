import { Component, Input } from '@angular/core';

import { NxConfigService, IConfig } from '@services/nx-config';

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
