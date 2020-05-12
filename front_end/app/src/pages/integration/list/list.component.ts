import {
    Component, OnDestroy,
    Input, SimpleChanges, OnChanges
}                                    from '@angular/core';
import { NxRibbonService }           from '../../../components/ribbon';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';
import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';

@Component({
    selector    : 'integrations-list-component',
    templateUrl : 'list.component.html',
    styleUrls   : ['list.component.scss']
})

export class NxIntegrationsListComponent implements OnDestroy, OnChanges {
    @Input() list;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnDestroy() {
        this.ribbonService.hide();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.list.currentValue) {
            const haveInReviewOrDraft = changes.list.currentValue
                .some(plugin => plugin.pending || plugin.draft);

            if (haveInReviewOrDraft) {
                this.showRibbon();
            } else {
                this.ribbonService.hide();
            }
        }
    }

    private showRibbon(): void {
        this.ribbonService.show(
            this.LANG.ribbon.integration.previewRibbon,
            this.LANG.ribbon.integration.backToEditText,
            this.CONFIG.integration.adminLink.replace('%ID%/pages/', '')
        );
    }
}
