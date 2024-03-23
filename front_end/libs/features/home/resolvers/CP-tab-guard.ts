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
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';

export const cpTabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean | Observable<boolean> => {
    const router: Router = inject(Router);
    const store: Store = inject(Store);
    const cpService: NxChannelPartnersService = inject(NxChannelPartnersService);
    const path = route.routeConfig?.path;
    const currPartner$$ = store.selectSignal(selectCurrentPartner);
    const permissionsStore = inject(PermissionsStore);
    const checkPermissions = (): boolean => {
        if (path === 'subchannels') {
            return permissionsStore.canViewSubChannels$$();
        } else {
            switch (path) {
                case 'settings':
                case 'information':
                    if (permissionsStore.canViewPartnerSettings$$()) {
                        return true;
                    }
                    break;
                case 'users':
                    if (permissionsStore.canViewPartnerUsers$$()) {
                        return true;
                    }
                    break;
                case 'reports':
                    if (permissionsStore.canViewPartnerReports$$()) {
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
        return checkPermissions();
    } else {
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
                return checkPermissions();
            }),
        );
    }
};
