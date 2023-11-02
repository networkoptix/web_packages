import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';

import staticLang from '@language_static';
import { images } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy()
@Component({
    selector: 'nx-support',
    templateUrl: 'support.component.html',
    styleUrls: ['support.component.scss'],
})
export class NxSupportComponent implements OnChanges {
    @Input() supportNode: AboutNode;

    LANG = staticLang;
    cleanSupportNode: AboutNode;
    errorManager = new ErrorStateManager();
    images = images;

    constructor(private sanitizer: DomSanitizer) {}

    ngOnInit(): void {
        this.updateCleanedSupportNode(this.supportNode);
        const supportConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title'],
            null,
            this.errorManager.buildConfig(['shortDescription']),
        );
        this.errorManager.checkAboutNode(this.supportNode, supportConfig);
    }

    ngOnChanges(changes: NgChanges<NxSupportComponent>): void {
        this.updateCleanedSupportNode(changes.supportNode.currentValue);
    }

    private updateCleanedSupportNode(supportNode: AboutNode): void {
        this.cleanSupportNode = cloneDeep(supportNode);
        this.cleanSupportNode.asset.shortDescription = this.sanitizer.bypassSecurityTrustHtml(
            this.cleanSupportNode.asset.shortDescription,
        );
    }
}
