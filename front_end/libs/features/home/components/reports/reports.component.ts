import { NgFor } from '@angular/common';
import { Component, computed, HostBinding, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@language_static';
import { Mode } from '@pages/home/components/reports/reports.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { nxConfig } from '@services/nx-config/config';
import { icons } from '@static-variables';

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
    mode$$ = input.required<`${Mode}`>({ alias: 'mode' });

    private channelPartnerService = inject(NxChannelPartnersService);
    private entityId$$ = computed(() => {
        const params = this.channelPartnerService.paramStateHandler.state$$()?.params || {};
        if (params?.organizationId) {
            return params.organizationId;
        } else if (params?.subChannelId) {
            return params.subChannelId;
        }
        return params?.partnerId || '';
    });

    private entityUrl$$ = computed<string>(() => {
        const entityId = this.entityId$$();
        const mode = this.mode$$();
        return (mode === Mode.Partner ? `channel-partner` : `organization`) + '/' + entityId;
    });

    services$$ = computed<ServiceCard[]>(() => {
        const entityUrl = this.entityUrl$$();
        const services = [
            {
                name: staticLang.appHeader.headerMenuNodes.reports.nodes.serviceChanges.displayName,
                icon: 'donut_chart.svg',
                url: `/reports/${entityUrl}/service-changes`,
            },
        ];
        if (nxConfig.featureFlags.channelPartnersAccessServiceUsage) {
            services.unshift({
                name: staticLang.appHeader.headerMenuNodes.reports.nodes.serviceUsage.displayName,
                icon: 'bar_chart.svg',
                url: `/reports/${entityUrl}/service-usage`,
            });
        }
        return services;
    });

    protected readonly icons = icons;
}
