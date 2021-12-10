import { Component, Input, Inject, OnChanges, SimpleChanges } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { IConfig, NxConfigService } from '@services/nx-config';
import { NxUtilsService } from '@services/utils.service';
import { WINDOW } from '@services/window-provider';

import { AboutNode } from '../about.component';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy()
@Component({
    selector: 'nx-get-started',
    templateUrl: 'get-started.component.html',
    styleUrls: ['get-started.component.scss']
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
        const getStartedConfig = this.errorManager.buildConfig(
            ['title'],
            this.errorManager.buildConfig(
                ['icon', 'title'],
                null,
                this.errorManager.buildConfig(
                    ['title']
                )
            ));
        this.errorManager.checkAboutNode(
            this.getStartedNode,
            getStartedConfig
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        const getStartedNode = NxUtilsService.deepCopy(
            changes.getStartedNode.currentValue
        );
        getStartedNode.nodes.forEach(step => {
            const images = step.icon.split(' ');
            step.icon = images[0];
            step.aniIcon = images[1];
            step.currentIcon = step.icon;
            step.url = step.url ||
                (step.assetId ? `/docs/content/${step.assetId}` : '');
        });
        this.steps = getStartedNode;
    }
}
