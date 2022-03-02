import { Component, Input, Inject, OnChanges } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

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

    ngOnChanges(changes: NgChanges<NxGetStartedComponent>): void {
        const getStartedNode = cloneDeep(changes.getStartedNode.currentValue);
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
