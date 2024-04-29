import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { FormattedUsageReportRecord } from '@pages/reports/service-usage/service-usage.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    OrgUsageReportEntry,
    PartnerUsageReportEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ServiceUsageState {
    isLoading: boolean;
    orgUsageReports: OrgUsageReportEntry[];
    partnerUsageReports: PartnerUsageReportEntry[];
}

const initialState: ServiceUsageState = {
    isLoading: true,
    orgUsageReports: [],
    partnerUsageReports: [],
};

export const ServiceUsageStore = signalStore(
    withState(initialState),
    withComputed(store => ({
        orgUsageReportsForTable$$: computed<FormattedUsageReportRecord[]>(() =>
            store
                .orgUsageReports()
                .map(
                    ({
                        service_id,
                        service_name,
                        used_by,
                        channels,
                        monthly_rate,
                        daily_rate,
                    }) => ({
                        serviceId: service_id,
                        serviceName: service_name,
                        usedByPartnerOrSystemCount: used_by,
                        usedByOrgCount: 0,
                        channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
        partnerUsageReportsForTable$$: computed<FormattedUsageReportRecord[]>(() =>
            store
                .partnerUsageReports()
                .map(
                    ({
                        service_id,
                        service_name,
                        used_by_organizations,
                        used_by_channel_partners,
                        channels,
                        monthly_rate,
                        daily_rate,
                    }) => ({
                        serviceId: service_id,
                        serviceName: service_name,
                        usedByPartnerOrSystemCount: used_by_channel_partners,
                        usedByOrgCount: used_by_organizations,
                        channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
    })),
    withMethods((store, CPService = inject(NxChannelPartnersService)) => ({
        async loadPartnerServiceUsage(
            entityId: string,
            startTs: string,
            endTs: string,
        ): Promise<void> {
            patchState(store, { isLoading: true });
            const serviceUsageRecords = await firstValueFrom(
                CPService.getPartnerServiceUsage(entityId),
            );
            patchState(store, {
                isLoading: false,
                orgUsageReports: [],
                partnerUsageReports: serviceUsageRecords,
            });
        },
        async loadOrgServiceUsage(entityId: string, startTs: string, endTs: string): Promise<void> {
            patchState(store, { isLoading: true });
            const serviceUsageRecords = await firstValueFrom(
                CPService.getOrganizationServiceUsage(entityId),
            );
            patchState(store, {
                isLoading: false,
                orgUsageReports: serviceUsageRecords,
                partnerUsageReports: [],
            });
        },
    })),
);
