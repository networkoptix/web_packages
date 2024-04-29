import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language/language_i18n_static.json';
import { icons } from '@static-variables';

import type { FormattedUsageReportRecord } from '../service-usage.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

@Component({
    selector: 'nx-service-usage-table',
    templateUrl: './service-usage-table.component.html',
    imports: [
        TranslateModule,
        NxBaseTableComponent,
        CommonModule,
        NxAddSvgSrcDirective,
        AngularSvgIconModule,
        NxHintComponent,
    ],
    standalone: true,
})
export class NxServiceUsageTableComponent {
    icons = icons;
    LANG = staticLang;
    constructor(private router: Router) {}

    headers: HEADER_ITEM[] = [
        { value: 'Service Name', name: 'serviceName' },
        { value: 'Used By', name: 'usedBy' },
        {
            value: 'Channels',
            name: 'channels',
            tooltip: this.LANG.channelPartnerReports.channelsTooltip,
        },
        {
            value: 'Monthly Rate',
            name: 'monthlyRate',
            tooltip: this.LANG.channelPartnerReports.monthlyRateTooltip,
        },
        {
            value: 'Fractional Usage',
            name: 'fractionalUsage',
            tooltip: this.LANG.channelPartnerReports.fractionalUsageTooltip,
        },
    ];
    selectedRecordId = '';
    records = input.required<FormattedUsageReportRecord[]>();

    selectService(serviceId: string): void {
        const urlSegments = this.router.url.split('/');
        urlSegments.push(serviceId);
        this.router.navigate(urlSegments);
    }
}
