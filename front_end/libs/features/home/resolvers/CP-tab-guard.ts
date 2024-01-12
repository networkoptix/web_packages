import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map } from 'rxjs';

import { ChannelPartnerPermissions } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as cpActions from '../store/channel-partners/channel-partners.actions';
import {
    selectCurrentPartner,
    selectCurrentPartnerId,
} from '../store/channel-partners/channel-partners.selectors';

export const cpTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | Observable<boolean> => {
    const router: Router = inject(Router);
    const store: Store = inject(Store);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route.routeConfig?.path;
    const currPartner$$ = store.selectSignal(selectCurrentPartner);
    const currPartnerId$$ = store.selectSignal(selectCurrentPartnerId);
    const checkPermissions = (permissions: string[] | undefined): boolean => {
        if (permissions) {
            switch (path) {
                case 'settings':
                case 'information':
                    if (permissions.includes(ChannelPartnerPermissions.CONFIGURE_CHANNEL_PARTNER)) {
                        return true;
                    }
                    break;
                case 'users':
                    if (permissions.includes(ChannelPartnerPermissions.MANAGE_USERS)) {
                        return true;
                    }
                    break;
                case 'reports':
                    if (permissions.includes(ChannelPartnerPermissions.VIEW_SERVICE_REPORTS)) {
                        return true;
                    }
                    break;
            }
        }
        router.navigate(['404']);
        return false;
    };

    const currPartner = currPartner$$();
    if (currPartner) {
        return checkPermissions(currPartner.ownPermissions);
    } else {
        const id = currPartnerId$$();
        return cpService.getChannelPartners().pipe(
            map(partners => {
                const channelPartnerIds = new Set<string>(partners.map(partner => partner.id));
                store.dispatch(
                    cpActions.setChannelPartners({
                        channelPartners: partners.filter(
                            partner =>
                                !partner.parentChannelPartner ||
                                !channelPartnerIds.has(partner.parentChannelPartner),
                        ),
                    }),
                );
                const fetchedPartner = partners.find(partner => partner.id === id);
                return checkPermissions(fetchedPartner?.ownPermissions);
            }),
        );
    }
};
