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
    error: string;
    hasError: boolean;
    isLoading: boolean;
    orgUsageReports: OrgUsageReportEntry[];
    partnerUsageReports: PartnerUsageReportEntry[];
}

const initialState: ServiceUsageState = {
    error: '',
    hasError: false,
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
                        sub_type,
                    }) => ({
                        serviceId: service_id,
                        serviceName: service_name,
                        serviceType: sub_type,
                        usedByPartnerCount: 0,
                        usedByOrgCount: 0,
                        usedBySystemCount: used_by,
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
                        sub_type,
                    }) => ({
                        serviceId: service_id,
                        serviceName: service_name,
                        serviceType: sub_type,
                        usedByPartnerCount: used_by_channel_partners,
                        usedByOrgCount: used_by_organizations,
                        usedBySystemCount: 0,
                        channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
    })),
    withMethods((store, CPService = inject(NxChannelPartnersService)) => ({
        async loadPartnerServiceUsage(entityId: string, startTs: string): Promise<void> {
            patchState(store, { error: '', hasError: false, isLoading: true });
            let serviceUsageRecords: PartnerUsageReportEntry[];
            try {
                serviceUsageRecords = await firstValueFrom(
                    CPService.getPartnerServiceUsage(entityId, startTs),
                );
            } catch ({ error }) {
                patchState(store, { error: error?.detail ?? '', isLoading: false, hasError: true });
                return;
            }
            patchState(store, {
                isLoading: false,
                orgUsageReports: [],
                partnerUsageReports: serviceUsageRecords,
            });
        },
        async loadOrgServiceUsage(entityId: string, startTs: string): Promise<void> {
            patchState(store, { error: '', hasError: false, isLoading: true });
            let serviceUsageRecords: OrgUsageReportEntry[];
            try {
                serviceUsageRecords = await firstValueFrom(
                    CPService.getOrganizationServiceUsage(entityId, startTs),
                );
            } catch ({ error }) {
                patchState(store, { error: error?.detail ?? '', isLoading: false, hasError: true });
                return;
            }
            patchState(store, {
                isLoading: false,
                orgUsageReports: serviceUsageRecords,
                partnerUsageReports: [],
            });
        },
    })),
);
