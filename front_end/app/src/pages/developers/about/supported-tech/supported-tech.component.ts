import { Component, Input, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { AboutNode } from '../about.component';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-supported-tech',
    templateUrl: 'supported-tech.component.html',
    styleUrls: ['supported-tech.component.scss']
})
export class NxSupportedTechComponent {
    @Input() supportedTechNode: AboutNode;

    CONFIG: IConfig;
    errorManager: ErrorStateManager;

    constructor(
        public router: Router,
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit(): void {
        const { nodes, ...supportedTech } = this.supportedTechNode;
        this.supportedTechNode = {
            ...supportedTech,
            nodes: nodes.map(({ nodes, ...section }) => ({
                ...section,
                nodes: nodes.map(({ url, assetId, ...node }) => ({
                    ...node,
                    assetId,
                    url: url || (assetId ? `/docs/content/${assetId}` : '')
                }))
            }))
        };
        const supportedTechConfig = this.errorManager.buildConfig(
            ['title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'nodes', 'icon'],
                this.errorManager.buildConfig(['title'])
            )
        );
        this.errorManager.checkAboutNode(
            this.supportedTechNode,
            supportedTechConfig
        );
    }
}
