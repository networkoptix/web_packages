import { Component, Input, Output, EventEmitter, Inject } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';

import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';
import { WINDOW } from '../../../../services/window-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-capabilities',
    templateUrl : 'capabilities.component.html',
    styleUrls   : ['capabilities.component.scss']
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesNode: AboutNode;
    @Input() supportedTechNode: AboutNode;

    CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }
};
