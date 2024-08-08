import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import staticLang from '@language/language_i18n_static.json';
import { HiddenNameLink } from '@pages/reports/hidden-name-link/hidden-name-link.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { RegularServiceDetailDialogResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxHiddenNameLinkComponent } from '../../hidden-name-link/hidden-name-link.component';
import {
    RegularServiceTotals,
    type FormattedRegularServiceRecord,
} from '../regular-service-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

@Component({
    selector: 'nx-regular-service-table',
    templateUrl: './regular-service-table.component.html',
    styleUrls: ['./regular-service-table.component.scss'],
    imports: [
        TranslateModule,
        NxBaseTableComponent,
        CommonModule,
        NxHintComponent,
        NxTooltipV2Directive,
        NxHiddenNameLinkComponent,
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
    records = input.required<FormattedRegularServiceRecord[]>();
    totals = input.required<RegularServiceTotals>();
    serviceId = input.required<string>();
    entityId = input.required<string>();
    startTs = input<string>('');

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    isHiddenNameLink(usedBy: string | HiddenNameLink): boolean {
        return typeof usedBy !== 'string';
    }

    openRegularServiceDetailsDialog({
        id: entityId,
        type: entityType,
        usedBy,
    }: FormattedRegularServiceRecord): void {
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
                );
                break;
            case 'organization':
                regularServiceDialogData$ = this.CPService.getOrganizationRegularDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                );
                break;
            case 'system':
                regularServiceDialogData$ = this.CPService.getOrgSystemDetailTable(
                    parentEntityId,
                    entityId,
                    serviceId,
                    startTs,
                );
                break;
            default:
                regularServiceDialogData$ = this.CPService.getPartnerRegularDetailTable(
                    entityId,
                    serviceId,
                    startTs,
                );
        }

        const entityName = typeof usedBy === 'string' ? usedBy : usedBy.name;
        this.dialogsService.viewRegularServiceDetails({ regularServiceDialogData$, entityName });
    }
}
