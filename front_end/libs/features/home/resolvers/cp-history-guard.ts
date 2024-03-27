import { inject } from '@angular/core';
import {
    CanActivateFn,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    Router,
} from '@angular/router';

import { ChannelPartnersRouteState } from '../store/route-state/route-state.store';

export const HistoryGuard: CanActivateFn = async (
    _: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> => {
    const lastRoute = inject(ChannelPartnersRouteState).lastRouteFromHistory$$();
    if (state.url === '/home' && lastRoute && lastRoute !== state.url) {
        await inject(Router).navigate([lastRoute], { queryParamsHandling: 'preserve' });
    }
    return true;
};
