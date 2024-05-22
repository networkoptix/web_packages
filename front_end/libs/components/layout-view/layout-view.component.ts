// import { Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash-es';
import { TourService } from 'ngx-ui-tour-md-menu';
import {
    asyncScheduler,
    combineLatest,
    firstValueFrom,
    forkJoin,
    merge,
    Observable,
    Subject,
    timer,
} from 'rxjs';
import {
    catchError,
    throttleTime,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith,
    switchMap,
    tap,
} from 'rxjs/operators';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import {
    LayoutPlaceholder,
    placeholderNameLookup,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { GroupsCacheStore } from '@pages/home/store/groups/groups-cache.store';
import { NxTranslatePipe } from '@pipes/nx-translate.pipe';
import { NxAccountService } from '@services/account.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { ActiveLayoutSelectors } from '@services/layout-state/store/active-layout';
import { SharedLayoutsSelectors } from '@services/layout-state/store/shared';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { Organization } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { Layout } from '@services/system-api.types/layouts.types';
import { CurrentUser } from '@services/system-user.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { SystemResourcesSelectors } from '@store/system-resources';
import { cleanIdLegacy } from '@utils/general';
import { generateTour, translateStep } from '@utils/nx';

import { registerDemoLogger } from './timeline-service-demo';
import { createFocusLayoutFactory } from './utils/create-focus-layout-factory';
import { createNewLayoutFactory } from './utils/create-new-layout-factory';
import { defaultLayoutSelectorFactory } from './utils/default-layout-selector-factory';
import { findSelectedLayoutFactory } from './utils/find-selected-layout-factory';
import { generateResourceTree } from './utils/generate-resource-tree';
import { layoutIdChangeSideEffectFactory } from './utils/layout-id-change-side-effect-factory';

enum CloudLayoutTours {
    DEFAULT = 'default',
}

const cloudLayoutTours = {
    [CloudLayoutTours.DEFAULT]: [
        'grid',
        'left-menu',
        ResourceType.LAYOUTS,
        'add_layout',
        { anchorId: 'selected-layout', isOptional: true },
        ResourceType.SERVERS,
        ResourceType.CAMERAS,
        ResourceType.WEB_PAGES,
        { anchorId: 'selected-focus', isOptional: true },
        'help',
    ],
};

const onlyActiveOrgs = (org: Organization): boolean => org.effectiveState === 'active';

@UntilDestroy()
@Component({
    selector: 'nx-layout-view',
    templateUrl: 'layout-view.component.html',
    styleUrls: ['layout-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxLayoutViewComponent {
    LANG = staticLang;
    CONFIG = nxConfig;
    ptzControlTarget: NxSystemCamera;

    selectedSystem$ = this.systemService.currentSystem$;
    editedLayout$ = toObservable(this.layoutStateService.editedLayout$$).pipe(untilDestroyed(this));

    groupsCacheStore = inject(GroupsCacheStore);

    // Temporary version refrence. To prevent conflicts with Parti's open MR.
    useV2api = false;

    systemOnline$ = this.selectedSystem$.pipe(
        tap(system => {
            this.useV2api = system.version >= 6.0;
        }),
        switchMap(system =>
            system.isOnline
                ? Promise.resolve(true)
                : system.mediaserver.ping().pipe(map(() => true)),
        ),
        catchError(() => Promise.resolve(false)),
        startWith(true),
        shareReplay({ bufferSize: 1, refCount: true }),
        untilDestroyed(this),
    );

    layoutItemLookup$ = this.systemService.currentSystem$.pipe(
        switchMap(system =>
            forkJoin([
                this.layoutStateService.loadUnsavedLayouts(system.id),
                this.layoutStateService.loadCrossSystemLayouts(),
            ]).pipe(map(() => system)),
        ),
        switchMap(({ permissionManager }) => {
            return combineLatest([
                // Update this to fetch system resources for all systems
                this.store.select(SystemResourcesSelectors.selectResourceValuesAllSystems),
                this.layoutStateService.paramStateHandler.state$.pipe(
                    map(({ params: { systemId } }) => systemId),
                ),
                this.#selectedLayout$.pipe(startWith(null)),
                this.store.select(SharedLayoutsSelectors.selectLayouts),
                new Promise<CurrentUser>(resolve => resolve(permissionManager.currentUser$$())),
                this.editedLayout$,
                nxConfig.featureFlags.layoutsCrossSystemEditing
                    ? this.systemsService.systemsSubject
                    : Promise.resolve([] as NxSystemInfo[]),
                this.groupsCacheStore.getAllOrgStructures(onlyActiveOrgs),
            ]).pipe(throttleTime(1000, asyncScheduler, { leading: true, trailing: true }));
        }),
        filter(res => Object.values(res[0]).every(Boolean) && !res[5]),
        map(cloneDeep),
        filter(([allSystemResources, currentSystemId]) => !!allSystemResources[currentSystemId]),
        switchMap(lookupState =>
            this.layoutStateService.paramStateHandler.state$.pipe(
                map(({ queryParams }) => ({
                    hasQuery: !!queryParams?.search?.[0],
                    openNodes: queryParams?.openNodes || [],
                })),
                map(search => [...lookupState, search, this.useV2api] as const),
            ),
        ),
        map(generateResourceTree),
        filter(lookup => !!lookup),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
    );

    #defaultLayout$: Observable<string> = this.layoutItemLookup$.pipe(
        switchMap(async ({ tree }) =>
            defaultLayoutSelectorFactory(this.layoutStateService.paramStateHandler.state$$)(tree),
        ),
        distinctUntilChanged(),
        untilDestroyed(this),
    );

    #layoutId$ = this.store.select(ActiveLayoutSelectors.selectActiveLayoutState).pipe(
        filter(layoutId => !!layoutId),
        switchMap(layoutId =>
            layoutId === 'default' ? this.#defaultLayout$ : Promise.resolve(layoutId),
        ),
        map(layoutId =>
            layoutIdChangeSideEffectFactory(
                this.layoutStateService.paramStateHandler.state$$,
                this.systemService.getCurrentSystem().info.name,
                (title: string) => this.pageService.pageTitle(title),
            )(layoutId),
        ),
        untilDestroyed(this),
    );

    #selectedLayout$ = combineLatest([
        this.selectedSystem$,
        this.#layoutId$,
        this.store.select(SharedLayoutsSelectors.selectLayouts),
        this.selectedSystem$.pipe(
            switchMap(({ id }) =>
                this.store.select(SystemResourcesSelectors.selectResourcesValuesBySystemId(id)),
            ),
        ),
    ]).pipe(
        switchMap(args => {
            if (args[1] === LayoutPlaceholder.NO_LAYOUTS) {
                return Promise.resolve(this.createPlaceholder(LayoutPlaceholder.NO_LAYOUTS));
            }

            return findSelectedLayoutFactory(this.createNewLayout, this.createFocusLayout)(args);
        }),
        switchMap(layout =>
            timer(layout ? 0 : 2500).pipe(
                map(() => layout || this.createPlaceholder(LayoutPlaceholder.SHOW_404)),
            ),
        ),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    #fetchingLayout$: Subject<'fetching'> = new Subject();

    selectedLayout$: Observable<Layout> = merge(this.#selectedLayout$, this.#fetchingLayout$).pipe(
        map(current => (current === 'fetching' ? null : current)),
        filter(layout => !!layout),
        map(cloneDeep),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    layoutAndItems$ = combineLatest([this.selectedLayout$, this.layoutItemLookup$]).pipe(
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    constructor(
        private accountService: NxAccountService,
        private cd: ChangeDetectorRef,
        private cloudApi: NxCloudApiService,
        private dialogsService: NxDialogsService,
        private pageService: NxPageService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private tourService: TourService,
        private translate: TranslateService,
        private store: Store,
        public layoutStateService: LayoutStateService,
    ) {
        registerDemoLogger(this);
    }

    ngOnInit(): void {
        this.selectedSystem$
            .pipe(untilDestroyed(this))
            .subscribe(system =>
                this.pageService.pageTitle(
                    [staticLang.pageTitles.layouts, system.info.name, this.CONFIG.cloudName].join(
                        ' - ',
                    ),
                ),
            );
        this.#selectedLayout$
            .pipe(
                switchMap(layout => timer(layout ? 0 : 2500).pipe(map(() => layout))),
                untilDestroyed(this),
            )
            .subscribe(layout => !layout && this.pageService.redirect404());
    }

    initTour = (tourGroup: CloudLayoutTours = CloudLayoutTours.DEFAULT): void => {
        if (!nxConfig.featureFlags.layoutsTour && !nxConfig.featureFlags.layoutsDemo) {
            return;
        }
        this.tourService.initialize(
            generateTour('cloud-layouts')(cloudLayoutTours[tourGroup]).map(
                translateStep((...args) =>
                    new NxTranslatePipe(this.translate, this.cd).transform(...args),
                ),
            ),
        );
        firstValueFrom(
            this.cloudApi.checkFeatureNotice('cloudLayouts', () =>
                this.dialogsService.cloudLayoutsInfo().then(start => {
                    if (start) {
                        this.tourService.start();
                    }
                    if (start !== false) {
                        return Promise.reject();
                    }
                }),
            ),
        );
    };

    changeLayout(layout: string | DropdownItem<string>): void {
        const layoutId = typeof layout === 'string' ? cleanIdLegacy(layout) : layout.value;
        this.layoutStateService.paramStateHandler.state$$.set({ params: { layoutId } });
        if (layoutId) {
            this.#fetchingLayout$.next('fetching');
            WebRTCStreamManager.updatePosition();
            this.ptzControlTarget = null;
        }
    }

    createNewLayout = createNewLayoutFactory(
        () => this.systemService.currentSystem$$()?.userManager.currentUser?.id || '',
    );

    createPlaceholder = (id: LayoutPlaceholder): Layout =>
        this.createNewLayout(
            this.systemService.currentSystem$$().id || '',
            '',
            placeholderNameLookup[id],
        );

    createFocusLayout = createFocusLayoutFactory({
        layoutItemLookup$: this.layoutItemLookup$,
        account: this.accountService.account,
        focusViewToken: this.layoutStateService.focusViewToken,
        selectedLayout$: this.#selectedLayout$,
    });

    updateLayout = (layoutId: string): Promise<string> => {
        this.changeLayout(layoutId);

        return firstValueFrom(
            this.#selectedLayout$.pipe(
                map(({ id }) => id),
                filter(id => id === layoutId),
            ),
        );
    };
}
