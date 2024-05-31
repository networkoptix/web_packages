import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, firstValueFrom } from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectAreChannelPartnersAndOrgsLoading,
    selectChannelPartners,
    selectChannelStructure,
    selectOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxAppStateService } from '@services/nx-app-state.service';
import type {
    ChannelPartner,
    ChannelPartnersStructure,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { LoadingState } from '@store/channel-partners/channel-partners.state';

export const entityResolver: ResolveFn<void> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router = inject(Router);
    const store = inject(Store);
    const appStateService = inject(NxAppStateService);

    const areChannelPartnersAndOrgsLoading$ = store.select<LoadingState>(
        selectAreChannelPartnersAndOrgsLoading,
    );
    const channelPartners$$ = store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    const organizations$$ = store.selectSignal<Organization[]>(selectOrganizations);
    const channelStructure$$ = store.selectSignal<ChannelPartnersStructure | undefined>(
        selectChannelStructure,
    );

    appStateService.ready = false;
    store.dispatch(CPActions.loadPartnersOrgsAndStructure());
    await firstValueFrom(
        areChannelPartnersAndOrgsLoading$.pipe(
            filter(loadState => loadState === LoadingState.LOADED),
        ),
    );

    // handle redirection if needed
    const channelPartners = channelPartners$$();
    const organizations = organizations$$();
    const channelStructure = channelStructure$$();

    const urlSegments = state.url.split('/');
    const entityTypeFromUrl = urlSegments[2];
    const urlHasValidEntityType = ['channel-partner', 'organization'].includes(entityTypeFromUrl);

    const entityIdFromUrl = urlSegments[3];
    const urlHasValidPartner = channelPartners.some(
        channelPartner => channelPartner.id === entityIdFromUrl,
    );
    const urlHasValidOrg = organizations.some(org => org.id === entityIdFromUrl);

    const tab = urlSegments[4];

    if (!entityTypeFromUrl) {
        const defaultEntityType = channelPartners.length ? 'channel-partner' : 'organization';
        const defaultEntityId = channelPartners.length
            ? channelStructure?.channelPartners[0].id
            : channelStructure?.organizations[0].id;
        await router.navigate(['reports', defaultEntityType, defaultEntityId, 'service-usage']);
    } else if (!urlHasValidEntityType || (!urlHasValidPartner && !urlHasValidOrg)) {
        await router.navigate(['404']);
    } else if (urlHasValidPartner && !tab) {
        await router.navigate(['reports', 'channel-partner', entityIdFromUrl, 'service-usage']);
    } else if (urlHasValidOrg && !tab) {
        await router.navigate(['reports', 'organization', entityIdFromUrl, 'service-usage']);
    }
};
