import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language/language_i18n_static.json';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { DetailTableResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import type { FormattedServiceDetailRecord } from '../service-usage-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

@Component({
    selector: 'nx-service-details-table',
    templateUrl: './service-details-table.component.html',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule, NxHintComponent],
    standalone: true,
})
export class NxServiceDetailsTableComponent {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        { value: 'Used By', name: 'usedBy' },
        {
            value: 'Changed',
            name: 'changed',
            tooltip: this.LANG.channelPartnerReports.changedTooltip,
        },
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
    records = input.required<FormattedServiceDetailRecord[]>();
    serviceId = input.required<string>();
    entityId = input.required<string>();

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    openDetailsDialog({
        id: entityId,
        type: entityType,
        usedBy: entityName,
    }: FormattedServiceDetailRecord): void {
        const serviceId = this.serviceId();
        const parentEntityId = this.entityId();
        let detailTableData$: Observable<DetailTableResponse>;
        switch (entityType) {
            case 'channel_partner':
                detailTableData$ = this.CPService.getPartnerDetailTable(entityId, serviceId);
                break;
            case 'organization':
                detailTableData$ = this.CPService.getOrganizationDetailTable(entityId, serviceId);
                break;
            case 'system':
                detailTableData$ = this.CPService.getOrgSystemDetailTable(
                    parentEntityId,
                    entityId,
                    serviceId,
                );
                break;
            default:
                detailTableData$ = this.CPService.getPartnerDetailTable(entityId, serviceId);
        }

        this.dialogsService.viewUsageDetails({ detailTableData$, entityName });
    }
}
