import { Component, Input, OnInit } from '@angular/core';

import { icons } from '@static-variables';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-new-capabilities',
    templateUrl: './capabilities.component.html',
    styleUrls: ['./capabilities.component.scss'],
})
export class NxNewCapabilitiesComponent implements OnInit {
    @Input() devCapabilitiesNode: AboutNode;

    errorManager = new ErrorStateManager();
    svg = {
        width: '72',
        height: '76',
    };
    icons = icons;

    ngOnInit(): void {
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title', 'nodes'],
            this.errorManager.buildConfig(['title', 'displayName', 'asset', 'icon'], null),
        );
        this.errorManager.checkAboutNode(this.devCapabilitiesNode, capabilitiesConfig);
    }
}
