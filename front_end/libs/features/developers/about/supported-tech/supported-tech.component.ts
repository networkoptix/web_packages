import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { images } from '@static-variables';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { NxErrorStateComponent } from '../error-state/error-state.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-supported-tech',
    templateUrl: 'supported-tech.component.html',
    styleUrls: ['supported-tech.component.scss'],
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        TranslateModule,
        NxAddSvgSrcDirective,
        NxErrorStateComponent,
    ],
    standalone: true,
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
