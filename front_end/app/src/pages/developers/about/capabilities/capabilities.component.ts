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

    CONFIG: IConfig;

    getCapabilityBlockStyle(capability: AboutNode) {
        const backgroundColor = capability.icon.split(' ')[2] || '#35464f';
        const backgroundImage = `linear-gradient(to right, ${
            capability.icon.split(' ')[3] || '#35464f'
        } 25%, rgba(53, 70, 79, 0)), url('${
            this.CONFIG.icons.backgrounds + capability.icon.split(' ')[1]}`;
        return ({ backgroundColor, backgroundImage });
    }

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }
};
