import { Component, Inject, Input } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { WINDOW } from '@services/window-provider';

import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-capabilities',
    templateUrl : 'capabilities.component.html',
    styleUrls   : ['capabilities.component.scss']
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesNode: AboutNode;

    CONFIG: IConfig;
    errorManager: ErrorStateManager;

    getCapabilityBlockStyle(capability: AboutNode) {
        const backgroundColor = capability.icon.split(' ')[2] || '#35464f';
        const backgroundImage = `linear-gradient(to right, ${
            capability.icon.split(' ')[3] || '#35464f'
        } 25%, rgba(53, 70, 79, 0)), url('${
            this.CONFIG.icons.backgrounds + capability.icon.split(' ')[1]}`;
        return ({ backgroundColor, backgroundImage });
    }

    constructor(
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit() {
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'displayName', 'icon'],
                null,
                this.errorManager.buildConfig(
                    ['title', 'shortDescription', 'blocks']
                ))
        );
        this.errorManager.checkAboutNode(
            this.capabilitiesNode,
            capabilitiesConfig
        );
    }
};
