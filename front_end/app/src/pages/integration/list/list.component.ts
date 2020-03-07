import {
    Component, OnDestroy,
    Input, SimpleChanges, OnChanges, OnInit
} from '@angular/core';

import { NxConfigService }           from '../../../services/nx-config/nx-config.service';
import { NxRibbonService }           from '../../../components/ribbon/ribbon.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { IntegrationService }        from '../integration.service';
import { IConfig } from '../../../services/nx-config/config-types';

@Component({
    selector   : 'integrations-list-component',
    templateUrl: 'list.component.html',
    styleUrls  : ['list.component.scss']
})

export class NxIntegrationsListComponent implements OnInit, OnDestroy, OnChanges {

    @Input() list;

    CONFIG: IConfig;
    LANG: any;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    constructor(configService: NxConfigService,
                private integrations: IntegrationService,
                private ribbonService: NxRibbonService,
                private language: NxLanguageProviderService) {

        this.setupDefaults(configService);
    }

    ngOnDestroy() {
        this.ribbonService.hide();
    }

    ngOnInit() {
    }

    ngOnChanges(changes: SimpleChanges) {
        let haveInReviewOrDraft;
        if (changes.list.currentValue) {
            changes.list.currentValue.some(plugin => {
                if (plugin.pending || plugin.draft) {
                    haveInReviewOrDraft = true;
                    return true;
                }
            });

            if (haveInReviewOrDraft) {
                this.showRibbon();
            } else {
                this.ribbonService.hide();
            }
        }
    }

    private showRibbon(): void {
        this.ribbonService.show(
                this.LANG.ribbon.integration.preview,
                this.LANG.ribbon.integration.backToEditText,
                this.CONFIG.integration.adminLink.replace('%ID%/pages/', '')
        );
    }
}

