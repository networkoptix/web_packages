import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { images } from '@static-variables';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-supported-tech',
    templateUrl: 'supported-tech.component.html',
    styleUrls: ['supported-tech.component.scss'],
})
export class NxSupportedTechComponent {
    @Input() supportedTechNode: AboutNode;

    errorManager = new ErrorStateManager();
    images = images;

    constructor(public router: Router) {}

    ngOnInit(): void {
        const { nodes, ...supportedTech } = this.supportedTechNode;
        this.supportedTechNode = {
            ...supportedTech,
            nodes: nodes.map(({ nodes, ...section }) => ({
                ...section,
                nodes: nodes.map(({ url, assetId, ...node }) => ({
                    ...node,
                    assetId,
                    url: url || (assetId ? `/docs/content/${assetId}` : ''),
                })),
            })),
        };
        const supportedTechConfig = this.errorManager.buildConfig(
            ['title', 'nodes'],
            this.errorManager.buildConfig(
                ['title', 'nodes', 'icon'],
                this.errorManager.buildConfig(['title']),
            ),
        );
        this.errorManager.checkAboutNode(this.supportedTechNode, supportedTechConfig);
    }
}
