import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    OrgUsageReportEntry,
    PartnerUsageReportEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ServiceUsageState {
    isLoading: boolean;
    reportRecords: PartnerUsageReportEntry[] | OrgUsageReportEntry[];
}

const initialState: ServiceUsageState = {
    isLoading: true,
    reportRecords: [],
};

export const ServiceUsageStore = signalStore(
    withState(initialState),
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
                reportRecords: serviceUsageRecords,
            });
        },
        async loadOrgServiceUsage(entityId: string, startTs: string, endTs: string): Promise<void> {
            patchState(store, { isLoading: true });
            const serviceUsageRecords = await firstValueFrom(
                CPService.getOrganizationServiceUsage(entityId),
            );
            patchState(store, {
                isLoading: false,
                reportRecords: serviceUsageRecords,
            });
        },
    })),
);
