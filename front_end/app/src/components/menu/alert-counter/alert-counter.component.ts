import { Component, Input } from '@angular/core';
import { NxConfigService }                                from '../../../services/nx-config/nx-config.service';
import { IConfig } from '../../../services/nx-config/config-types';

@Component({
    selector     : 'nx-alert-counter',
    templateUrl  : './alert-counter.component.html',
    styleUrls    : ['./alert-counter.component.scss'],
})
export class NxAlertCounter {
    @Input() count: any;
    @Input() type: any;

    CONFIG: IConfig;

    constructor(private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }
}
