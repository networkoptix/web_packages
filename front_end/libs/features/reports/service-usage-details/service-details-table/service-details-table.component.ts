import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { NxBaseTableComponent } from '@components/table/table.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { DetailTableResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import type { FormattedServiceDetailRecord } from '../service-usage-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-service-details-table',
    templateUrl: './service-details-table.component.html',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule],
    standalone: true,
})
export class NxServiceDetailsTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Used By', name: 'usedBy' },
        { value: 'Changed', name: 'changed' },
        { value: 'Active Channels', name: 'activeChannels' },
        { value: 'Monthly Rate', name: 'monthlyRate' },
        { value: 'Fractional Usage', name: 'fractionalUsage' },
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
