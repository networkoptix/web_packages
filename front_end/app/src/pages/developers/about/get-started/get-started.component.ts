import { Component, Input, Inject, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { DOCUMENT }                 from '@angular/common';
import { UntilDestroy }             from '@ngneat/until-destroy';

import { NxUtilsService } from '../../../../services/utils.service';
import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { AboutNode } from '../about.component';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { WINDOW } from '@services/window-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-get-started',
    templateUrl : 'get-started.component.html',
    styleUrls   : ['get-started.component.scss']
})
export class NxGetStartedComponent implements OnChanges {
    @Input() getStartedNode: AboutNode;
    CONFIG: IConfig;
    steps: AboutNode;
    errorManager: ErrorStateManager;

    constructor(
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window) {
        this.CONFIG = configService.config;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit() {
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['title'],
            this.errorManager.buildConfig(
                ['icon', 'title', 'subtitle'],
                null,
                this.errorManager.buildConfig(
                    ['title']
                )
            ));
        this.errorManager.checkAboutNode(
            this.getStartedNode,
            capabilitiesConfig
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        const getStartedNode = NxUtilsService.deepCopy(changes.getStartedNode.currentValue);
        getStartedNode.nodes.forEach(step => {
            const images = step.icon.split(' ');
            step.icon = images[0];
            step.aniIcon = images[1];
            step.currentIcon = step.icon;
            step.url = step.url || step.assetId ? `/docs/content/${step.assetId}` : '';
        });
        this.steps = getStartedNode;
    }
}
