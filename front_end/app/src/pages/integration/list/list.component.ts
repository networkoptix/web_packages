import {
    Component, OnDestroy,
    Input, SimpleChanges, OnChanges, OnInit
} from '@angular/core';

import { NxConfigService }           from '../../../services/nx-config';
import { NxRibbonService }           from '../../../components/ribbon/ribbon.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { IntegrationService }        from '../integration.service';

@Component({
    selector   : 'integrations-list-component',
    templateUrl: 'list.component.html',
    styleUrls  : ['list.component.scss']
})

export class NxIntegrationsListComponent implements OnInit, OnDestroy, OnChanges {

    @Input() list;

    CONFIG: any;
    LANG: any;

    haveInReviewOrDraft: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    constructor(private configService: NxConfigService,
                private integrations: IntegrationService,
                private ribbonService: NxRibbonService,
                private language: NxLanguageProviderService) {

        this.setupDefaults();
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
                this.LANG.integration.previewRibbonText,
                this.LANG.integration.backToEditText,
                this.CONFIG.links.admin.product.replace('%ID%/pages/', '')
        );
    }
}

