import { Component, Inject, Input, OnInit } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-new-capabilities',
    templateUrl: './capabilities.component.html',
    styleUrls: ['./capabilities.component.scss']
})
export class NxNewCapabilitiesComponent implements OnInit {
    @Input() devCapabilitiesNode: AboutNode;

    errorManager: ErrorStateManager;
    CONFIG: IConfig;
    svg = {
        width: '72',
        height: '76'
    };

    constructor(
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit(): void {
        const capabilitiesConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'displayName', 'asset', 'icon'],
                null)
        );
        this.errorManager.checkAboutNode(
            this.devCapabilitiesNode,
            capabilitiesConfig
        );
    }
}
