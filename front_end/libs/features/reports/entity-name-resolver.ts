import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Store } from '@ngrx/store';

import {
    selectChannelPartners,
    selectOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const entityNameResolver: ResolveFn<string> = async (route: ActivatedRouteSnapshot) => {
    const store = inject(Store);

    const channelPartners$$ = store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    const organizations$$ = store.selectSignal<Organization[]>(selectOrganizations);
    const { entityId } = route.params;

    const entityName =
        channelPartners$$().find(({ id }) => id === entityId)?.name ||
        organizations$$().find(({ id }) => id === entityId)?.name ||
        '';
    return entityName;
};
