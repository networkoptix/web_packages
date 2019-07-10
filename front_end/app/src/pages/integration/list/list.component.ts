import {
    Component, OnDestroy,
    Input, SimpleChanges, OnChanges
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

export class NxIntegrationsListComponent implements OnDestroy, OnChanges {

    @Input() list;

    CONFIG: any;
    LANG: any;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
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

    ngOnChanges(changes: SimpleChanges) {
        let haveInReviewOrDraft = false;
        if (changes.list.currentValue) {
            // inject platform icons info
            changes.list.currentValue.some(plugin => {
                if (plugin.pending || plugin.draft) {
                    haveInReviewOrDraft = true;
                    return true;
                }
            });

            if (haveInReviewOrDraft) {
                this.language
                    .translationsSubject
                    .subscribe((lang) => {
                        if (Object.keys(lang).length) {
                            this.LANG = lang;

                            this.ribbonService.show(
                                    this.LANG.integration.previewRibbonText,
                                    this.LANG.integration.backToEditText,
                                    this.CONFIG.links.admin.product.replace('%ID%/pages/', '')
                            );
                        }
                    });
            }
        }
    }
}

