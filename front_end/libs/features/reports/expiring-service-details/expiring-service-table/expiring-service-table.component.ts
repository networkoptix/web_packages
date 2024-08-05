import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language/language_i18n_static.json';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { ExpiringServiceDetailDialogResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import {
    ExpiringServiceTotals,
    type FormattedExpiringServiceRecord,
} from '../expiring-service-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

const apiPage = 1;
const apiPageSize = 1000;

@Component({
    selector: 'nx-expiring-service-table',
    templateUrl: './expiring-service-table.component.html',
    styleUrls: ['./expiring-service-table.component.scss'],
    imports: [TranslateModule, NxBaseTableComponent, CommonModule, NxHintComponent],
    standalone: true,
})
export class NxExpiringServiceTableComponent {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        { value: 'Used By', name: 'usedBy', align: 'flex-start' },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.expirationDate,
            name: 'expirationDate',
            tooltip: this.LANG.channelPartnerReports.tooltips.expirationDate,
        },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.channels,
            name: 'channels',
            tooltip: this.LANG.channelPartnerReports.tooltips.channels,
        },
    ];
    selectedRecordId = '';
    records = input.required<FormattedExpiringServiceRecord[]>();
    totals = input.required<ExpiringServiceTotals>();
    serviceId = input.required<string>();
    entityId = input.required<string>();
    startTs = input<string>('');

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    openExpiringServiceDetailsDialog({
        id: entityId,
        type: entityType,
        usedBy: entityName,
        hasMultipleExpirations,
    }: FormattedExpiringServiceRecord): void {
        if (!hasMultipleExpirations) {
            return;
        }

        const serviceId = this.serviceId();
        const startTs = this.startTs();
        let expiringServiceDialogData$: Observable<ExpiringServiceDetailDialogResponse>;
        switch (entityType) {
            case 'channel_partner':
                expiringServiceDialogData$ = this.CPService.getPartnerExpiringDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
                break;
            case 'organization':
                expiringServiceDialogData$ = this.CPService.getOrganizationExpiringDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
                break;
            default:
                expiringServiceDialogData$ = this.CPService.getPartnerExpiringDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
        }

        this.dialogsService.viewExpiringServiceDetails({ expiringServiceDialogData$, entityName });
    }
}
