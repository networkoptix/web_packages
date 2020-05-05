import { Component, Input, OnInit } from '@angular/core';
import { NxConfigService, IConfig } from '../../../services';

// TODO: need to style component

@Component({
    selector   : 'nx-system-alert-card-component',
    templateUrl: 'card.component.html',
    styleUrls  : ['card.component.scss']
})
export class NxSystemAlertCardComponent implements OnInit {
    @Input() data: any;
    CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
    }

}
