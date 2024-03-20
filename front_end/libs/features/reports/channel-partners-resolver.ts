import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, firstValueFrom } from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectAreChannelPartnersAndOrgsLoading,
    selectChannelPartners,
    selectOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxAppStateService } from '@services/nx-app-state.service';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { LoadingState } from '@store/channel-partners/channel-partners.state';

export const channelPartnersResolver: ResolveFn<void> = async (
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

    appStateService.ready = false;
    store.dispatch(CPActions.loadChannelPartnersAndOrgs({ includeChildOrgs: true }));
    await firstValueFrom(
        areChannelPartnersAndOrgsLoading$.pipe(
            filter(loadState => loadState === LoadingState.LOADED),
        ),
    );

    // handle redirection if needed
    const channelPartners = channelPartners$$();
    const organizations = organizations$$();

    const urlSegments = state.url.split('/');
    const entityTypeFromUrl = urlSegments[2];
    const entityTypeFromUrlIsValid = ['channel-partner', 'organization'].includes(
        entityTypeFromUrl,
    );

    const entityIdFromUrl = urlSegments[3];
    const urlHasPartnerId = channelPartners.some(
        channelPartner => channelPartner.id === entityIdFromUrl,
    );
    const urlHasOrgId = organizations.some(org => org.id === entityIdFromUrl);

    const tab = urlSegments[4];

    if (!entityTypeFromUrlIsValid || (!urlHasPartnerId && !urlHasOrgId)) {
        await router.navigate([
            'reports',
            'channel-partner',
            channelPartners[0].id,
            'service-usage',
        ]);
    } else if (urlHasPartnerId && !tab) {
        await router.navigate(['reports', 'channel-partner', entityIdFromUrl, 'service-usage']);
    } else if (urlHasOrgId && !tab) {
        await router.navigate(['reports', 'organization', entityIdFromUrl, 'service-usage']);
    }
};
