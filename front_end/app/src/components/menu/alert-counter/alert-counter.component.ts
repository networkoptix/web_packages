import { Component, Input }         from '@angular/core';
import { NxConfigService, IConfig } from '../../../services';

@Component({
    selector   : 'nx-alert-counter',
    templateUrl: './alert-counter.component.html',
    styleUrls  : ['./alert-counter.component.scss'],
})
export class NxAlertCounter {
    @Input() count: any;
    @Input() type: any;

    CONFIG: IConfig;

    constructor(private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }
}
