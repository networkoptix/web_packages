import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';

import { OrgPermissions } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as cpActions from '../store/channel-partners/channel-partners.actions';
import { selectCurrentOrganization } from '../store/channel-partners/channel-partners.selectors';

export const orgTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    const store: Store = inject(Store);
    const router: Router = inject(Router);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route?.routeConfig?.path;
    const currOrg$$ = store.selectSignal(selectCurrentOrganization);
    const checkPermissions = (permissions: string[]): boolean => {
        switch (path) {
            case 'settings':
                if (permissions?.includes(OrgPermissions.CONFIGURE_ORGANIZATION)) {
                    return true;
                }
                break;
            case 'users':
                if (permissions?.includes(OrgPermissions.MANAGE_USERS)) {
                    return true;
                }
                break;
            case 'reports':
                if (permissions?.includes(OrgPermissions.VIEW_SERVICE_REPORTS)) {
                    return true;
                }
                break;
        }
        router.navigate(['404']);
        return false;
    };

    const currOrg = currOrg$$();
    if (currOrg) {
        return checkPermissions(currOrg.ownPermissions);
    } else {
        const obs = cpService.getOrganizations();
        const id = route.parent?.params.organizationId;
        obs.subscribe(orgs => {
            let org = orgs.find(org => org.id === id);
            store.dispatch(cpActions.setOrganizations({ rootOrganizations: orgs }));
            if (!org) {
                const partnerId =
                    route.parent?.params.partnerId ||
                    route.parent?.parent?.parent?.params.partnerId;
                cpService.getPartnerOrganizations(partnerId).subscribe(cpOrgs => {
                    org = cpOrgs.find(org => org.id === id);
                    store.dispatch(
                        cpActions.setCurrentPartner({
                            currentPartnerId: id,
                            currentPartnerOrganizations: cpOrgs,
                        }),
                    );
                    return checkPermissions(org?.ownPermissions);
                });
            } else {
                return checkPermissions(org?.ownPermissions);
            }
        });
    }
};
