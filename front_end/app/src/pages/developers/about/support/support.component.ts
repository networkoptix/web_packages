import { Component, Input, OnChanges, Inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy()
@Component({
    selector: 'nx-support',
    templateUrl: 'support.component.html',
    styleUrls: ['support.component.scss']
})
export class NxSupportComponent implements OnChanges {
    @Input() supportNode: AboutNode;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    cleanSupportNode: AboutNode;
    errorManager: ErrorStateManager;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private sanitizer: DomSanitizer,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit(): void {
        const supportConfig = this.errorManager.buildConfig(
            ['displayName', 'icon', 'title'],
            null,
            this.errorManager.buildConfig(
                ['shortDescription', 'url']
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
