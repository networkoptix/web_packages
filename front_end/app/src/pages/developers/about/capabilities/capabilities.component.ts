import { Component, Inject, Input } from '@angular/core';

import { IConfig, NxConfigService } from '@services/nx-config';
import { WINDOW } from '@services/window-provider';

import { AboutNode } from '../about.component';
import { ErrorStateManager } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-capabilities',
    templateUrl: 'capabilities.component.html',
    styleUrls: ['capabilities.component.scss']
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesNode: AboutNode;

    CONFIG: IConfig;
    errorManager: ErrorStateManager;

    constructor(
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit() {
        this.capabilitiesNode = {
            ...this.capabilitiesNode,
            nodes: this.capabilitiesNode.nodes
                .map(({ url, assetId, ...capability }) => ({
                    ...capability,
                    assetId,
                    url: url || (assetId ? `/docs/content/${assetId}` : '')
                }))
        };
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'subtitle', 'displayName', 'icon'],
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
