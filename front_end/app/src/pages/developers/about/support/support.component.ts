import {Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewEncapsulation} from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { AboutNode } from '../about.component';
import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxUtilsService } from "@services/utils.service";
import { DomSanitizer }        from '@angular/platform-browser';

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

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private sanitizer: DomSanitizer
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.cleanSupportNode = NxUtilsService.deepCopy(changes.supportNode.currentValue);
        this.cleanSupportNode.asset.blocks.forEach(block => {
            if (block.contentHTML) {
                block.contentHTML = this.sanitizer.bypassSecurityTrustHtml(block.contentHTML);
            }
        });
    }
}
