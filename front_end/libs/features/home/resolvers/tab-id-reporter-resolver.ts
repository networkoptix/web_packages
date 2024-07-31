import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot, Routes } from '@angular/router';

import { isUUID } from '@utils/general';

import { ChannelPartnersRouteState, DEFAULT_TAB_ID } from '../store/route-state/route-state.store';

const TabIdReporterResolver: ResolveFn<string> = (
    _: ActivatedRouteSnapshot,
    routerState: RouterStateSnapshot,
) => {
    const routerStateStore = inject(ChannelPartnersRouteState);
    const path = routerState.url;
    const pathSegments = path.split('/');
    let tabId = pathSegments.pop()?.split('?')[0];

    if (tabId && isUUID(tabId)) {
        tabId = pathSegments.pop();
    }

    if (tabId && tabId.includes('@')) {
        tabId = pathSegments.pop();
    }

    if (tabId === 'channel-partners' || !tabId) {
        tabId = DEFAULT_TAB_ID;
    }

    if (tabId) {
        routerStateStore.updateState('tabId', tabId);
    }
    return tabId;
};

export const withTabReporterResolver = (routes: Routes): Routes =>
    routes.map(route => ({
        ...route,
        resolve: { ...route.resolve, currentTabRoute: TabIdReporterResolver },
        ...(route.children ? { children: withTabReporterResolver(route.children) } : {}),
    }));
