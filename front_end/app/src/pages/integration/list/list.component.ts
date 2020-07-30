import {
    Component, OnDestroy,
    Input, SimpleChanges, OnChanges
}                                    from '@angular/core';
import { BehaviorSubject }           from 'rxjs';

import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { NxRibbonService }           from '../../../components/ribbon/ribbon.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';

@Component({
    selector    : 'integrations-list-component',
    templateUrl : 'list.component.html',
    styleUrls   : ['list.component.scss']
})

export class NxIntegrationsListComponent implements OnDestroy, OnChanges {
    @Input() list: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    gridColumnLookup: {[key: string]: string} = {};
    ready = new BehaviorSubject(false);

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
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
            setTimeout(() => this.ready.next(true));
        }
    }

    updateTagSize(tagName: string, { width }) {
        if (this.gridColumnLookup[tagName]) return;
        const gridGap = 5;
        const columns = Math.round(width / gridGap);
        this.gridColumnLookup[tagName] = `span ${columns}`;
    }

    private showRibbon(): void {
        this.ribbonService.show(
            this.LANG.ribbon.integration.previewRibbon,
            this.LANG.ribbon.integration.backToEditText,
            this.CONFIG.integration.adminLink.replace('%ID%/pages/', '')
        );
    }
}
