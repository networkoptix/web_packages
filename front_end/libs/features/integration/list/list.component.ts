import {
    Component,
    OnDestroy,
    Input,
    OnChanges
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-integrations-list-component',
    templateUrl: 'list.component.html',
    styleUrls: ['list.component.scss']
})

export class NxIntegrationsListComponent implements OnDestroy, OnChanges {
    @Input() list;

    CONFIG: IConfig;
    LANG = staticLang;

    gridColumnLookup: { [key: string]: string } = {};
    ready = new BehaviorSubject(false);

    constructor(
        configService: NxConfigService,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy(): void {
        this.ribbonService.hide();
    }

    ngOnChanges(changes: NgChanges<NxIntegrationsListComponent>): void {
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

    updateTagSize(tagName: string, { width }): void {
        if (this.gridColumnLookup[tagName]) return;
        const gridGap = 5;
        const columns = Math.round(width / gridGap);
        this.gridColumnLookup[tagName] = `span ${columns}`;
    }

    private showRibbon(): void {
        this.ribbonService.show(
            this.LANG.ribbon.integration.previewRibbon,
            [{
                type: 'link',
                text: this.LANG.ribbon.integration.backToEditText,
                value: this.CONFIG.integration.adminLink.replace('%ID%/pages/', '')
            }]
        );
    }
}
