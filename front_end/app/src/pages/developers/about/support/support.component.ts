import {Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewEncapsulation, Inject} from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { AboutNode } from '../about.component';
import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxUtilsService } from '@services/utils.service';
import { DomSanitizer }        from '@angular/platform-browser';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { WINDOW } from '@services/window-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-support',
    templateUrl : 'support.component.html',
    styleUrls   : ['support.component.scss']
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

    ngOnInit() {
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

    ngOnChanges(changes: SimpleChanges): void {
        this.cleanSupportNode = NxUtilsService.deepCopy(changes.supportNode.currentValue);
        this.cleanSupportNode.asset.shortDescription = this.sanitizer.bypassSecurityTrustHtml(this.cleanSupportNode.asset.shortDescription);
    }
}
