import { Component, Input } from '@angular/core';

import { icons, images } from '@lib/variables/static-variables';
import { windowFactory } from '@services/window-provider';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-capabilities',
    templateUrl: 'capabilities.component.html',
    styleUrls: ['capabilities.component.scss'],
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesNode: AboutNode;

    errorManager: ErrorStateManager;
    icons = icons;
    images = images;

    constructor() {
        this.errorManager = new ErrorStateManager(windowFactory());
    }

    ngOnInit(): void {
        this.capabilitiesNode = {
            ...this.capabilitiesNode,
            nodes: this.capabilitiesNode.nodes.map(({ url, assetId, ...capability }) => ({
                ...capability,
                assetId,
                url: url || (assetId ? `/docs/content/${assetId}` : ''),
            })),
        };
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'subtitle', 'displayName', 'icon'],
                null,
                this.errorManager.buildConfig(['title', 'shortDescription', 'blocks']),
            ),
        );
        this.errorManager.checkAboutNode(this.capabilitiesNode, capabilitiesConfig);
    }
}
