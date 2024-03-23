import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, of, switchMap } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrgId,
    selectCurrentOrganization,
    selectCurrentPartnerId,
    selectHasStoreLoaded,
} from '@common/store/channel-partners/channel-partners.selectors';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { Organization } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const orgTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | Observable<boolean> => {
    const store: Store = inject(Store);
    const router: Router = inject(Router);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route?.routeConfig?.path;
    const currOrg$$ = store.selectSignal<Organization>(selectCurrentOrganization);
    const currOrgId$$ = store.selectSignal<string>(selectCurrentOrgId);
    const currPartnerId$$ = store.selectSignal<string>(selectCurrentPartnerId);
    const permissionsStore = inject(PermissionsStore);
    const checkPermissions = (): boolean => {
        switch (path) {
            case 'settings':
                if (
                    permissionsStore.canChangeOrganizationState$$() ||
                    permissionsStore.canViewOrgSettings$$()
                ) {
                    return true;
                }
                break;
            case 'users':
            case 'users/:email':
            case 'group/:groupId/users':
            case 'group/:groupId/users/:email':
                if (permissionsStore.canViewOrgUsers$$()) {
                    return true;
                }
                break;
            case 'reports':
                if (permissionsStore.canViewOrgReports$$()) {
                    return true;
                }
                break;
        }
        router.navigate(['404']);
        return false;
    };

    const currOrg = currOrg$$();
    if (currOrg) {
        return checkPermissions();
    } else {
        const id = currOrgId$$();
        store.dispatch(cpActions.loadChannelPartnersAndOrgs({ includeChildOrgs: false }));
        return store.select(selectHasStoreLoaded).pipe(
            filter(Boolean),
            take(1),
            switchMap(() => cpService.getOrganizations()),
            switchMap(orgs => {
                const org = orgs.find(org => org.id === id);
                const partnerId = currPartnerId$$();
                store.dispatch(cpActions.setRootOrganizations({ rootOrganizations: orgs }));
                if (org) {
                    return of(org);
                } else if (partnerId) {
                    return cpService.getPartnerOrganizations(partnerId).pipe(
                        map(cpOrgs => {
                            store.dispatch(
                                cpActions.setCurrentPartner({
                                    currentPartnerId: partnerId,
                                    currentPartnerOrganizations: cpOrgs,
                                }),
                            );
                            return cpOrgs.find(org => org.id === id);
                        }),
                    );
                } else if (orgs) {
                    return of(orgs[0]);
                }
                return of(null);
            }),
            map(org => checkPermissions()),
        );
    }
};
