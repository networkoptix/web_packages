import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, firstValueFrom } from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectAreChannelPartnersAndOrgsLoading,
    selectOrgsFromStructure,
    selectPartnersFromStructure,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxAppStateService } from '@services/nx-app-state.service';
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
    const partners$$ = store.selectSignal(selectPartnersFromStructure);
    const organizations$$ = store.selectSignal(selectOrgsFromStructure);

    appStateService.ready = false;
    store.dispatch(CPActions.loadChannelStructure());
    await firstValueFrom(
        areChannelPartnersAndOrgsLoading$.pipe(
            filter(loadState => loadState === LoadingState.LOADED),
        ),
    );

    // handle redirection if needed
    const partners = partners$$();
    const organizations = organizations$$();

    const urlSegments = state.url.split('/');
    const entityTypeFromUrl = urlSegments[2];
    const urlHasValidEntityType = ['channel-partner', 'organization'].includes(entityTypeFromUrl);

    const entityIdFromUrl = urlSegments[3];
    const urlHasValidPartner = partners.has(entityIdFromUrl);
    const urlHasValidOrg = organizations.has(entityIdFromUrl);

    const tab = urlSegments[4];

    if (!entityTypeFromUrl) {
        const defaultEntityType = partners.size ? 'channel-partner' : 'organization';
        const firstPartnerId = partners.get(partners.keys().next().value)?.id;
        const firstOrgId = organizations.get(organizations.keys().next().value)?.id;
        const defaultEntityId = partners.size ? firstPartnerId : firstOrgId;
        await router.navigate(['reports', defaultEntityType, defaultEntityId, 'service-usage']);
    } else if (!urlHasValidEntityType || (!urlHasValidPartner && !urlHasValidOrg)) {
        await router.navigate(['404']);
    } else if (urlHasValidPartner && !tab) {
        await router.navigate(['reports', 'channel-partner', entityIdFromUrl, 'service-usage']);
    } else if (urlHasValidOrg && !tab) {
        await router.navigate(['reports', 'organization', entityIdFromUrl, 'service-usage']);
    }
};
