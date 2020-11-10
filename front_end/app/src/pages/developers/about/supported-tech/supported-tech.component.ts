import { Component, Input, Output, EventEmitter, Inject } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';

import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';
import { WINDOW } from '../../../../services/window-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-supported-tech',
    templateUrl : 'supported-tech.component.html',
    styleUrls   : ['supported-tech.component.scss']
})
export class NxSupportedTechComponent {
    @Input() supportedTechNode: AboutNode;

    CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }
};
