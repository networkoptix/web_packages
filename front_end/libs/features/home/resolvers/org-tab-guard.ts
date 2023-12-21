import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, of, switchMap } from 'rxjs';

import { OrgPermissions } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as cpActions from '../store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrgId,
    selectCurrentOrganization,
    selectCurrentPartnerId,
} from '../store/channel-partners/channel-partners.selectors';

export const orgTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | Observable<boolean> => {
    const store: Store = inject(Store);
    const router: Router = inject(Router);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route?.routeConfig?.path;
    const currOrg$$ = store.selectSignal(selectCurrentOrganization);
    const currOrgId$$ = store.selectSignal(selectCurrentOrgId);
    const currPartnerId$$ = store.selectSignal(selectCurrentPartnerId);
    const checkPermissions = (permissions: string[] | undefined): boolean => {
        if (permissions) {
            switch (path) {
                case 'settings':
                    if (permissions?.includes(OrgPermissions.CONFIGURE_ORGANIZATION)) {
                        return true;
                    }
                    break;
                case 'users':
                case 'group/:groupId/users':
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
        }
        router.navigate(['404']);
        return false;
    };

    const currOrg = currOrg$$();
    if (currOrg) {
        return checkPermissions(currOrg.ownPermissions);
    } else {
        const id = currOrgId$$();
        return cpService.getOrganizations().pipe(
            switchMap(orgs => {
                const org = orgs.find(org => org.id === id);
                const partnerId = currPartnerId$$();
                store.dispatch(cpActions.setOrganizations({ rootOrganizations: orgs }));
                return org
                    ? of(org)
                    : cpService.getPartnerOrganizations(partnerId).pipe(
                          map(cpOrgs => {
                              store.dispatch(
                                  cpActions.setCurrentPartner({
                                      currentPartnerId: id,
                                      currentPartnerOrganizations: cpOrgs,
                                  }),
                              );
                              return cpOrgs.find(org => org.id === id);
                          }),
                      );
            }),
            map(org => checkPermissions(org?.ownPermissions)),
        );
    }
};
