import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';

import { ChannelPartnerPermissions } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as cpActions from '../store/channel-partners/channel-partners.actions';
import { selectCurrentPartner } from '../store/channel-partners/channel-partners.selectors';

export const cpTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    const router: Router = inject(Router);
    const store: Store = inject(Store);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route.routeConfig?.path;
    const currPartner$$ = store.selectSignal(selectCurrentPartner);
    const checkPermissions = (permissions: string[]): boolean => {
        switch (path) {
            case 'settings':
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
        router.navigate(['404']);
        return false;
    };

    const currPartner = currPartner$$();
    if (currPartner) {
        return checkPermissions(currPartner.ownPermissions);
    } else {
        const obs = cpService.getChannelPartners();
        const id = route.parent?.params.partnerId || route.parent?.parent?.parent?.params.partnerId;
        obs.subscribe(partners => {
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
        });
    }
};
