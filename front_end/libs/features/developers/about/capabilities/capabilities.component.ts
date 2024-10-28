import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxMatchHeightDirective } from '@directives/nx-match-height.directive';
import { PipesModule } from '@pipes/pipes.module';
import { icons, images } from '@static-variables';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { NxErrorStateComponent } from '../error-state/error-state.component';

@Component({
    selector: 'nx-capabilities',
    templateUrl: 'capabilities.component.html',
    styleUrls: ['capabilities.component.scss'],
    providers: [],
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        TranslateModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxMatchHeightDirective,
        NxErrorStateComponent,
    ],
    standalone: true,
})
export class NxCapabilitiesComponent {
    @Input() capabilitiesNode: AboutNode;

    errorManager = new ErrorStateManager();
    icons = icons;
    images = images;

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
