import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { cloneDeep } from 'lodash-es';

import { images } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { NxErrorStateComponent } from '../error-state/error-state.component';

@UntilDestroy()
@Component({
    selector: 'nx-get-started',
    templateUrl: 'get-started.component.html',
    styleUrls: ['get-started.component.scss'],
    imports: [CommonModule, RouterModule, TranslateModule, NxErrorStateComponent],
    standalone: true,
})
export class NxGetStartedComponent implements OnChanges {
    @Input() getStartedNode: AboutNode;
    steps: AboutNode;
    errorManager = new ErrorStateManager();
    images = images;

    ngOnInit(): void {
        this.updateSteps(this.getStartedNode);
        const getStartedConfig = this.errorManager.buildConfig(
            ['title'],
            this.errorManager.buildConfig(
                ['icon', 'title'],
                null,
                this.errorManager.buildConfig(['title']),
            ),
        );
        this.errorManager.checkAboutNode(this.getStartedNode, getStartedConfig);
    }

    ngOnChanges(changes: NgChanges<NxGetStartedComponent>): void {
        this.updateSteps(changes.getStartedNode.currentValue);
    }

    updateSteps(getStartedNode: AboutNode): void {
        const clonedNode = cloneDeep(getStartedNode);
        clonedNode.nodes.map(step => {
            const images = step.icon.split(' ');
            step.icon = images[0];
            step.aniIcon = images[1];
            step.currentIcon = step.icon;
            step.url = step.url || (step.assetId ? `/docs/content/${step.assetId}` : '');
            return step;
        });
        this.steps = clonedNode;
    }
}
