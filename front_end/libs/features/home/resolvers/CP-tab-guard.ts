import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import { selectCurrentPartner } from '@common/store/channel-partners/channel-partners.selectors';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    ChannelPartnerPermissions,
    ChannelPartnerRoles,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const cpTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | Observable<boolean> => {
    const router: Router = inject(Router);
    const store: Store = inject(Store);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route.routeConfig?.path;
    const currPartner$$ = store.selectSignal(selectCurrentPartner);
    const checkPermissions = (partner: ChannelPartner): boolean => {
        const { ownPermissions, ownRoles } = partner;
        if (path === 'subchannels') {
            return ownRoles.includes(ChannelPartnerRoles.ADMINISTRATOR);
        } else if (ownPermissions) {
            switch (path) {
                case 'settings':
                case 'information':
                    if (
                        ownPermissions.includes(ChannelPartnerPermissions.CONFIGURE_CHANNEL_PARTNER)
                    ) {
                        return true;
                    }
                    break;
                case 'users':
                    if (ownPermissions.includes(ChannelPartnerPermissions.MANAGE_USERS)) {
                        return true;
                    }
                    break;
                case 'reports':
                    if (ownPermissions.includes(ChannelPartnerPermissions.VIEW_SERVICE_REPORTS)) {
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
        return checkPermissions(currPartner);
    } else {
        return cpService.getChannelPartners().pipe(
            map(partners => {
                const channelPartnerIds = new Set<string>(partners.map(partner => partner.id));
                const id = route.parent?.params.partnerId;
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
                return checkPermissions(fetchedPartner);
            }),
        );
    }
};
