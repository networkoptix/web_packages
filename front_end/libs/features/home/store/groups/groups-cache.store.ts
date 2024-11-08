import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { patchState, signalStore, type, withMethods } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { memoize } from 'lodash-es';
import {
    catchError,
    combineLatest,
    debounce,
    debounceTime,
    filter,
    identity,
    map,
    Observable,
    of,
    repeat,
    retry,
    shareReplay,
    startWith,
    Subject,
    switchMap,
    tap,
    timer,
} from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystemLight,
    GroupStructureItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';

export interface GroupStructureCache {
    id: string;
    groups: GroupStructureItem[];
}

export interface CloudSystemLightCache {
    id: string;
    systems: CloudSystemLight[];
}

export interface GroupStructureItemWithCloudSystems extends GroupStructureItem {
    cloudSystems: CloudSystemLight[];
    children: GroupStructureItemWithCloudSystems[];
}

export interface OrgStructure {
    id: string;
    groups: GroupStructureItemWithCloudSystems[];
    cloudSystems: CloudSystemLight[];
}

const groupStructureItemEntity = {
    entity: type<GroupStructureCache>(),
    collection: 'groupStructure',
} as const;

const cloudSystemLightEntity = {
    entity: type<CloudSystemLightCache>(),
    collection: 'cloudSystemLight',
} as const;

export interface OrganizationAndStructure extends Organization, OrgStructure {}

const organizationEntity = { entity: type<Organization>(), collection: 'organization' } as const;

export const GroupsCacheStore = signalStore(
    { providedIn: 'root' },
    withEntities(organizationEntity),
    withEntities(groupStructureItemEntity),
    withEntities(cloudSystemLightEntity),
    withMethods(store => {
        const channelPartnerService = inject(NxChannelPartnersService);
        const systemsService = inject(NxSystemsService);

        const updater$ = new Subject<void>();

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const sharedRetry = <T>() =>
            retry<T>({
                delay: 5000,
                count: 2,
                resetOnSuccess: true,
            });

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const sharedRepeat = <T>() =>
            repeat<T>({
                // Leaving here in case we want to add auto updating back
                // delay: () => merge(updater$, timer(60_000)),
                delay: () => updater$,
            });

        const getOrganizationsMemoized = memoize(() => {
            return channelPartnerService.getOrganizations(true).pipe(
                tap(organizations =>
                    patchState(
                        store,
                        removeAllEntities(organizationEntity),
                        setAllEntities(organizations, organizationEntity),
                    ),
                ),
                sharedRetry(),
                catchError(<Caught>(_, caught: Caught) => of([]) as Caught),
                sharedRepeat(),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        });

        const getGroupsStructureMemoized = memoize((id: string) => {
            return channelPartnerService.getGroupsStructure(id).pipe(
                tap(groups =>
                    patchState(store, setEntity({ id, groups }, groupStructureItemEntity)),
                ),
                sharedRetry(),
                catchError(<Caught>(_, caught: Caught) => of([]) as Caught),
                sharedRepeat(),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        });

        const getUserSystemsMemoized = memoize((id: string) => {
            return channelPartnerService.getUserSystems(id, false).pipe(
                tap(systems =>
                    patchState(store, setEntity({ id, systems }, cloudSystemLightEntity)),
                ),
                sharedRetry(),
                catchError(<Caught>(_, caught: Caught) => of([]) as Caught),
                sharedRepeat(),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        });

        const getOrganizations = (): Observable<Organization[]> =>
            getOrganizationsMemoized().pipe(startWith(store.organizationEntities()));

        const getGroupsStructure = (orgId: string): Observable<GroupStructureItem[]> => {
            const cached = store.groupStructureEntityMap()[orgId]?.groups;
            return getGroupsStructureMemoized(orgId).pipe(cached ? startWith(cached) : identity);
        };

        const getUserSystems = (
            orgId: string,
            rootOnly = false,
        ): Observable<CloudSystemLight[]> => {
            const cached = store.cloudSystemLightEntityMap()[orgId]?.systems;
            return rootOnly
                ? channelPartnerService.getUserSystems(orgId, true)
                : getUserSystemsMemoized(orgId).pipe(cached ? startWith(cached) : identity);
        };

        const getFullOrgStructureMemoized = memoize((orgId: string): Observable<OrgStructure> => {
            const groups$ = getGroupsStructureMemoized(orgId);
            const systems$ = getUserSystemsMemoized(orgId);
            return combineLatest([groups$, systems$]).pipe(
                filter(
                    ([groups, systems]) =>
                        !groups.reduce((acc, { systemCount }) => acc && !!systemCount, false) ||
                        !!systems.length,
                ),
                map(([groups, systems]) => {
                    const withCloudSystems = (
                        group: GroupStructureItem,
                    ): GroupStructureItemWithCloudSystems => ({
                        ...group,
                        children: group.children.map(withCloudSystems),
                        cloudSystems: systems.filter(({ groupId }) => groupId === group.id),
                    });

                    return {
                        id: orgId,
                        groups: groups.map(withCloudSystems),
                        cloudSystems: systems.filter(({ groupId }) => !groupId),
                    };
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        });

        const getFullOrgStructure = (orgId: string): Observable<OrgStructure> =>
            getFullOrgStructureMemoized(orgId);
        const orgStructuresLoaded$ = new Subject<boolean>();
        const orgStructuresLoaded$$ = toSignal(
            orgStructuresLoaded$.pipe(debounce(loaded => (loaded ? timer(1_500) : of(loaded)))),
            {
                initialValue: false,
            },
        );

        const getAllOrgStructuresMemoized = memoize(
            (
                orgFilter: (org: Organization) => boolean = () => true,
            ): Observable<OrganizationAndStructure[]> =>
                getOrganizations().pipe(
                    switchMap(organizations =>
                        !organizations.length
                            ? of([])
                            : combineLatest(
                                  organizations.filter(orgFilter).map(organization =>
                                      getFullOrgStructure(organization.id).pipe(
                                          startWith({
                                              id: organization.id,
                                              groups: [],
                                              cloudSystems: [],
                                          } as OrgStructure),
                                          map(orgStructure => ({
                                              ...organization,
                                              ...orgStructure,
                                          })),
                                      ),
                                  ),
                              ),
                    ),
                    tap(() => orgStructuresLoaded$.next(false)),
                    debounceTime(500),
                    tap(() => orgStructuresLoaded$.next(true)),
                    shareReplay({ bufferSize: 1, refCount: false }),
                ),
        );

        const getAllOrgStructures = (
            orgFilter: (org: Organization) => boolean = () => true,
        ): Observable<OrganizationAndStructure[]> => getAllOrgStructuresMemoized(orgFilter);

        const refreshObservedCaches = (): void => {
            systemsService.forceUpdateSystems();
            updater$.next();
        };

        return {
            getOrganizations,
            getGroupsStructure,
            getUserSystems,
            getFullOrgStructure,
            getAllOrgStructures,
            refreshObservedCaches,
            orgStructuresLoaded$$,
            sharedRepeat,
        };
    }),
);
