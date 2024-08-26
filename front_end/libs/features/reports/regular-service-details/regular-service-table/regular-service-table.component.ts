import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import staticLang from '@language/language_i18n_static.json';
import { NxGroupPathComponent } from '@pages/reports/group-path/group-path.component';
import { HiddenNameLink } from '@pages/reports/hidden-name-link/hidden-name-link.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { RegularServiceDetailDialogResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxHiddenNameLinkComponent } from '../../hidden-name-link/hidden-name-link.component';
import {
    EntityFormattedRegularServiceRecord,
    FormattedRegularServiceRecord,
    RegularServiceTotals,
    SystemFormattedRegularServiceRecord,
} from '../regular-service-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

const apiPage = 1;
const apiPageSize = 1000;

@Component({
    selector: 'nx-regular-service-table',
    templateUrl: './regular-service-table.component.html',
    imports: [
        TranslateModule,
        NxBaseTableComponent,
        CommonModule,
        NxHintComponent,
        NxTooltipV2Directive,
        NxHiddenNameLinkComponent,
        NxGroupPathComponent,
    ],
    standalone: true,
})
export class NxRegularServiceTableComponent {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        { value: 'Used By', name: 'usedBy', align: 'flex-start' },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.changed,
            name: 'changed',
            tooltip: this.LANG.channelPartnerReports.tooltips.changed,
        },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.channels,
            name: 'channels',
            tooltip: this.LANG.channelPartnerReports.tooltips.channels,
        },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.monthlyRate,
            name: 'monthlyRate',
            tooltip: this.LANG.channelPartnerReports.tooltips.monthlyRate,
        },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.fractionalUsage,
            name: 'fractionalUsage',
            tooltip: this.LANG.channelPartnerReports.tooltips.fractionalUsage,
        },
    ];
    selectedRecordId = '';
    partnerRecords = input.required<EntityFormattedRegularServiceRecord[]>();
    orgRecords = input.required<SystemFormattedRegularServiceRecord[]>();
    totals = input.required<RegularServiceTotals>();
    serviceId = input.required<string>();
    entityId = input.required<string>();
    isPartnerTable = input.required<boolean>();
    startTs = input<string>('');

    records = computed<FormattedRegularServiceRecord[]>(() => {
        const isPartnerTable = this.isPartnerTable();
        const partnerRecords = this.partnerRecords();
        const orgRecords = this.orgRecords();

        return isPartnerTable ? partnerRecords : orgRecords;
    });

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    isHiddenNameLink(usedBy: string | HiddenNameLink): boolean {
        return typeof usedBy !== 'string';
    }

    openRegularServiceDetailsDialog(selectedRecord: FormattedRegularServiceRecord): void {
        const { id: entityId, type: entityType } = selectedRecord;
        const serviceId = this.serviceId();
        const parentEntityId = this.entityId();
        const startTs = this.startTs();
        let regularServiceDialogData$: Observable<RegularServiceDetailDialogResponse>;
        switch (entityType) {
            case 'channel_partner':
                regularServiceDialogData$ = this.CPService.getPartnerRegularDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
                break;
            case 'organization':
                regularServiceDialogData$ = this.CPService.getOrganizationRegularDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
                break;
            case 'system':
                regularServiceDialogData$ = this.CPService.getOrgSystemDetailTable(
                    parentEntityId,
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
                break;
            default:
                regularServiceDialogData$ = this.CPService.getPartnerRegularDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                    apiPage,
                    apiPageSize,
                );
        }

        let entityName: string;
        if ('usedBy' in selectedRecord) {
            const { usedBy } = selectedRecord;
            entityName = typeof usedBy === 'string' ? usedBy : usedBy.name;
        } else {
            entityName = selectedRecord.usedByPath[1];
        }
        this.dialogsService.viewRegularServiceDetails({ regularServiceDialogData$, entityName });
    }
}
