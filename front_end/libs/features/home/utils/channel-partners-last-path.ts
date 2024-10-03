import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith, tap } from 'rxjs';

import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';

export const channelPartnersLastPath = (): Signal<string> => {
    const router = inject(Router);
    const routerStateStore = inject(ChannelPartnersRouteState);
    return toSignal(
        router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => (event as NavigationEnd).url),
            startWith(router.url),
            map(url => url.split('/').pop() || ''),
            map(tab => {
                const path = tab.split('?').shift() ?? '';
                const { subChannelId, organizationId, partnerId, groupId } =
                    routerStateStore.state$$();
                return [subChannelId, organizationId, partnerId, groupId].includes(path)
                    ? ''
                    : path;
            }),
            tap(tab => routerStateStore.updateState('tabId', tab)),
        ),
        { initialValue: '' },
    );
};
