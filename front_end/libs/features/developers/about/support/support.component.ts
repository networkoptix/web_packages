import { Component, Input, OnChanges, Inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';

import staticLang from '@common/language/language_i18n_static.json';
import { images } from '@lib/variables/static-variables';
import { WINDOW } from '@services/window-provider';
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
    errorManager: ErrorStateManager;
    images = images;

    constructor(private sanitizer: DomSanitizer, @Inject(WINDOW) private window: Window) {
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit(): void {
        const supportConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title'],
            null,
            this.errorManager.buildConfig(
                ['shortDescription']
            )
        );
        this.errorManager.checkAboutNode(
            this.supportNode,
            supportConfig
        );
    }

    ngOnChanges(changes: NgChanges<NxSupportComponent>): void {
        this.cleanSupportNode = cloneDeep(changes.supportNode.currentValue);
        this.cleanSupportNode.asset.shortDescription =
            this.sanitizer.bypassSecurityTrustHtml(
                this.cleanSupportNode.asset.shortDescription
            );
    }
}
