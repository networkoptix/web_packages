import { InjectionToken, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import { addEntity, withEntities } from '@ngrx/signals/entities';
import { isEqual } from 'lodash-es';
import { Observable, combineLatest, distinctUntilChanged, map } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';

import { generateRoute } from './route-state-utils';

export const DEFAULT_TAB_ID = 'organizations';

const initialState = {
    organizationId: '',
    partnerId: '',
    groupId: '',
    email: '',
    subChannelId: '',
    tabId: DEFAULT_TAB_ID,
};

export type RouterState = typeof initialState;

const ROUTER_STATE = new InjectionToken<typeof initialState>('Router State', {
    factory: () => initialState,
});

export const ChannelPartnersRouteState = signalStore(
    { providedIn: 'root' },
    withState(() => inject(ROUTER_STATE)),
    /**
     * History currently used for debugging but we could use it for handling
     * back button in header if we end up having issues with the back button history.
     */
    withEntities({ entity: type<RouterState & { id: number }>(), collection: 'history' }),
    withMethods((store, channelPartnerService = inject(NxChannelPartnersService)) => {
        return {
            getChannelPartnerService() {
                return channelPartnerService;
            },
            updateState(key: keyof RouterState, value: string) {
                patchState(store, { [key]: value });
            },
            initializeRouteBinding(tabId$: Observable<string>) {
                return combineLatest([channelPartnerService.paramStateHandler.state$, tabId$]).pipe(
                    map(([{ params }, tabId]) => ({ ...params, tabId })),
                    distinctUntilChanged((a, b) => isEqual(a, b)),
                    map(({ tabId, ...state }) => {
                        const { tabId: _, ...params } = initialState;
                        const stateFromParams = Object.entries(state).reduce(
                            (acc, [key, value]) => ({
                                ...acc,
                                [key]: value || acc[key as keyof Omit<RouterState, 'tabId'>],
                            }),
                            params,
                        );
                        const nextState = {
                            tabId: tabId !== 'organizations' || state.organizationId ? tabId : '',
                            ...stateFromParams,
                        };
                        patchState(
                            store,
                            stateFromParams,
                            Object.values(stateFromParams).some(Boolean) ||
                                ['personal', 'shared'].includes(tabId)
                                ? addEntity(
                                      {
                                          ...nextState,
                                          id: Date.now(),
                                      },
                                      { collection: 'history' },
                                  )
                                : {},
                        );
                        return nextState;
                    }),
                    takeUntilDestroyed(),
                );
            },
        };
    }),
    withHooks({
        onInit: store => {
            store.initializeRouteBinding(toObservable(store.tabId)).subscribe();
        },
    }),
    withComputed(store => {
        const state$$ = computed(() => {
            const organizationId = store.organizationId();
            const partnerId = store.partnerId();
            const tabId = store.tabId();
            const groupId = store.groupId();
            const email = store.email();
            const subChannelId = store.subChannelId();
            const history = store.historyEntities();
            return { organizationId, partnerId, tabId, groupId, email, subChannelId, history };
        });

        const rootGroupLink$$ = computed(() => {
            const partnerId = store.partnerId();
            const subChannelId = store.subChannelId();
            const organizationId = store.organizationId();
            const tabId = store.tabId();
            return generateRoute({ partnerId, organizationId, subChannelId, tabId });
        });

        const getGroupLink$$ = computed(() => {
            const partnerId = store.partnerId();
            const subChannelId = store.subChannelId();
            const organizationId = store.organizationId();
            const tabId = store.tabId();
            return (groupId: string) =>
                generateRoute({ partnerId, organizationId, subChannelId, tabId, groupId });
        });

        const getTabLink$$ = computed(() => {
            const partnerId = store.partnerId();
            const organizationId = store.organizationId();
            const groupId = store.groupId();
            const subChannelId = store.subChannelId();

            return (tabId: string) =>
                generateRoute({ partnerId, organizationId, groupId, subChannelId, tabId });
        });

        const getBreadcrumbLink$$ = computed(() => {
            const partnerId = store.partnerId();
            const organizationId = store.organizationId();
            const subChannelId = store.subChannelId();

            return (itemId: string) => {
                const groupId = itemId === organizationId ? '' : itemId;
                return generateRoute({
                    partnerId,
                    organizationId,
                    groupId,
                    subChannelId,
                    tabId: 'users',
                });
            };
        });

        const getUserAccessLink$$ = computed(() => {
            const partnerId = store.partnerId();
            const organizationId = store.organizationId();
            const groupId = store.groupId();
            const subChannelId = store.subChannelId();
            const tabId = 'users';

            return (email: string) =>
                generateRoute({ partnerId, organizationId, groupId, subChannelId, tabId, email });
        });

        const partnersRoot$$ = computed(() => generateRoute({ partnerId: store.partnerId() }));

        const getOrganizationLink$$ = computed(() => {
            const partnerId = store.partnerId();
            return (organizationId: string) => generateRoute({ partnerId, organizationId });
        });

        const lastRouteFromHistory$$ = computed(
            () => store.historyEntities().map(generateRoute).reverse()[0],
        );

        return {
            state$$,
            getGroupLink$$,
            rootGroupLink$$,
            getTabLink$$,
            getBreadcrumbLink$$,
            getUserAccessLink$$,
            partnersRoot$$,
            getOrganizationLink$$,
            lastRouteFromHistory$$,
        };
    }),
);
