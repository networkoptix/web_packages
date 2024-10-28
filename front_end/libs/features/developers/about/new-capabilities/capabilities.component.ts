import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxMatchHeightDirective } from '@directives/nx-match-height.directive';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { NxErrorStateComponent } from '../error-state/error-state.component';

@Component({
    selector: 'nx-new-capabilities',
    templateUrl: './capabilities.component.html',
    styleUrls: ['./capabilities.component.scss'],
    imports: [
        CommonModule,
        AngularSvgIconModule,
        TranslateModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxMatchHeightDirective,
        NxErrorStateComponent,
    ],
    standalone: true,
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
