import { NgFor } from '@angular/common';
import { Component, computed, HostBinding, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@language_static';
import { Mode } from '@pages/home/components/reports/reports.types';
import { icons } from '@static-variables';
import {
    selectCurrentOrgId,
    selectCurrentPartnerId,
} from '@store/channel-partners/channel-partners.selectors';

import { NxCardComponent } from '../card/card.component';

interface ServiceCard {
    name: string;
    icon: string;
    url: string;
}

@Component({
    selector: 'nx-reports-tab',
    templateUrl: 'reports.component.html',
    styleUrls: [
        'reports.component.scss',
        '../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [NgFor, NxCardComponent, RouterLink, TranslateModule],
})
export class NxReportsComponent {
    @HostBinding('style.--channel-partners-header-height') headerHeight = '324px';
    private store = inject(Store);
    mode$$ = input.required<`${Mode}`>({ alias: 'mode' });

    private orgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    private partnerId$$ = this.store.selectSignal<string>(selectCurrentPartnerId);
    private entityUrl$$ = computed<string>(() => {
        const mode = this.mode$$();
        const orgId = this.orgId$$();
        const partnerId = this.partnerId$$();
        return mode === Mode.Partner ? `channel-partner/${partnerId}` : `organization/${orgId}`;
    });

    services$$ = computed<ServiceCard[]>(() => {
        const entityUrl = this.entityUrl$$();
        return [
            {
                name: staticLang.appHeader.headerMenuNodes.reports.nodes.serviceChanges.displayName,
                icon: 'donut_chart.svg',
                url: `/reports/${entityUrl}/service-changes`,
            },
            {
                name: staticLang.appHeader.headerMenuNodes.reports.nodes.serviceUsage.displayName,
                icon: 'bar_chart.svg',
                url: `/reports/${entityUrl}/service-usage`,
            },
        ];
    });

    protected readonly icons = icons;
}
