// import { Location } from '@angular/common';
import {
    Component,
    Inject,
    LOCALE_ID,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { uniq } from 'lodash-es';
import { BehaviorSubject, combineLatest, concat, defer, merge, Observable, Subject } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { LayoutResourceTree, ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';
import { WebRTCStreamManager } from '@components/video-player/WebRTCStreamManager';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Layouts, Layout, WebPages } from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { ICamera, TimeDetail } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemServer } from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { alphabeticalSort, cleanId } from '@utils/general';

interface Resource {
    name: string;
    id: string;
}

interface ResourceLookup<T = { id: string }> {
    [id: string]: ResourceNode<T>
}

@UntilDestroy()
@Component({
    selector: 'nx-layout-view',
    templateUrl: 'layout-view.component.html',
    styleUrls: ['layout-view.component.scss']
})

export class NxLayoutViewComponent {
    LANG = staticLang;
    CONFIG: IConfig;
    ptzControlTarget: ICamera;

    refreshLayouts$ = new BehaviorSubject('trigger update');

    selectedSystem$ = this.activatedRoute.params.pipe(
        switchMap(async ({ systemId }) => {
            let system: NxSystem;
            if (environment.isLocal) {
                const account = await this.accountService.get();
                system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account.id,
                    account.email
                );
            } else {
                await this.systemsService.getSystemAsPromise(systemId);
                system = this.systemService.createSystem(this.accountService.account.email, systemId);
            }
            await system.update();
            return system;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: false
        }),
        untilDestroyed(this)
    );

    layoutItemLookup$ = this.selectedSystem$.pipe(
        switchMap(({ mediaserver, serverManager, cameraManager }) => combineLatest([
            defer(() => cameraManager.getCameras()).pipe(switchMap(cameras => cameraManager.getRecordedTimes(cameras.map(({ id }) => id)).pipe(
                catchError(async () => [] as TimeDetail[]),
                map(times => cameras.map(({ status, ...camera }) => ({
                    ...camera,
                    status: ['Online', 'Offline'].includes(status) && times.find(({ cameraId }) => cameraId === camera.id) ? 'archive' : status
                })))
            ))),
            serverManager.getServers().pipe(catchError(async () => [] as NxSystemServer[])),
            mediaserver instanceof NxSystemRestAPI ? mediaserver.getWebPages().pipe(catchError(async () => [] as WebPages)) : Promise.resolve([] as WebPages),
            this.#selectedLayout$.pipe(startWith(null)),
            this.availableLayouts$.pipe(startWith([]))
        ])),
        map(([cameras, servers, webPages, currentLayout, layouts]): LayoutResourceTree => {
            const aspectRatio = currentLayout?.cellAspectRatio || 0;
            const parsedCameras = cameras.reduce((cameras, camera) => ({
                ...cameras,
                [camera.id]: {
                    type: ResourceType.CAMERA,
                    name: camera.name,
                    details: { ...camera, status: camera.status.toLowerCase() },
                    aspectRatio: +camera.overrideAr || camera.defaultRatio || aspectRatio
                }
            }), {} as ResourceLookup<typeof cameras[0]>);

            const parsedServers = servers.reduce((servers, server) => ({
                ...servers,
                [server.id]: {
                    type: ResourceType.SERVER,
                    name: server.name,
                    details: { ...server, status: server.status.toLowerCase() },
                    aspectRatio
                }
            }), {} as ResourceLookup<typeof servers[0]>);

            const parsedWebPages = webPages.reduce((webPages, webPage) => ({
                ...webPages,
                [webPage.id]: {
                    type: ResourceType.WEB_PAGE,
                    name: webPage.name,
                    details: webPage,
                    aspectRatio
                }
            }), {} as ResourceLookup<typeof webPages[0]>);
            const byName = alphabeticalSort<Pick<Resource, 'name'>>(this.locale, r => r.name || '');
            const layoutsForTree = layouts.filter(({ id }) => id && id !== 'new').map(({ name, id }) => ({
                name,
                id,
                type: ResourceType.LAYOUT,
                details: { id }
            }));
            const parsedResources = {
                ...parsedServers,
                ...parsedCameras,
                ...parsedWebPages,
                ...layoutsForTree.reduce((acc, layout) => ({ ...acc, [layout.details.id]: layout }), {})
            };
            const serversForTree = Object.values(parsedServers).sort(byName);
            const camerasForTree = Object.values(parsedCameras).sort(byName);
            const webPagesForTree = Object.values(parsedWebPages).sort(byName);

            return {
                tree: [
                    {
                        name: 'Layouts',
                        type: ResourceType.LAYOUTS,
                        children: layoutsForTree
                    },
                    {
                        name: 'Servers',
                        type: ResourceType.SERVERS,
                        children: serversForTree.map(server => ({
                            ...server,
                            children: []
                            // children: camerasForTree.filter(({ details: { parentId } }) => parentId === server.details.id)
                        }))
                    },
                    {
                        name: 'Cameras',
                        type: ResourceType.CAMERAS,
                        children: camerasForTree
                    },
                    {
                        name: 'Web Pages',
                        type: ResourceType.WEB_PAGES,
                        children: webPagesForTree
                    },
                ],
                ...parsedResources
            };
        }),
        shareReplay({
            bufferSize: 1,
            refCount: false
        }),
        untilDestroyed(this)
    );

    availableLayouts$: Observable<Layouts> = this.refreshLayouts$.pipe(
        switchMap(_ => this.selectedSystem$),
        switchMap(async ({
            mediaserver,
            id: systemId,
            userManager: {
                currentUser: {
                    id: parentId
                }
            }
        }) => {
            const layouts = mediaserver instanceof NxSystemRestAPI ? await mediaserver.getLayouts({ _keepDefault: true, parentId }).toPromise() : [];
            if (!layouts.length || this.CONFIG.featureFlags.layoutsLeftMenu || this.CONFIG.featureFlags.layoutsDemo) {
                layouts.push(this.createNewLayout(systemId, parentId, 'New Layout'));
            }

            return layouts;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: false
        }),
        untilDestroyed(this)
    );

    availableLayoutsDropdown$ = this.availableLayouts$.pipe(
        map(layouts => layouts.map(this.layoutToDropdown)),
        untilDestroyed(this)
    );

    #selectedLayout$ = combineLatest([
        this.selectedSystem$,
        this.activatedRoute.params,
        this.availableLayouts$
    ]).pipe(
        map(([system, { layoutId }, layouts]) => {
            if (layoutId && system.mediaserver instanceof NxSystemRestAPI) {
                const existingLayout = layouts.find(({ id }) => cleanId(id) === layoutId);
                if (existingLayout) {
                    return { systemId: system.id, ...existingLayout };
                }
            }
            return layoutId && this.createFocusLayout(system.id, layoutId);
        }),
        switchMap(layout => layout ? Promise.resolve([layout]) : this.availableLayouts$),
        map(layouts => layouts.pop()),
        tap(({ id }) => {
            const selectedLayoutId = cleanId(id);
            if (selectedLayoutId && selectedLayoutId !== this.activatedRoute.snapshot.params.layoutId) {
                this.changeLayout(selectedLayoutId);
            }
        }),
        shareReplay({
            bufferSize: 1,
            refCount: false
        }),
        untilDestroyed(this)
    );
    #fetchingLayout$: Subject<'fetching'> = new Subject();
    selectedLayout$ = merge(
        this.#selectedLayout$,
        this.#fetchingLayout$
    ).pipe(
        map(current => current === 'fetching' ? null : current),
        filter(layout => !!layout),
        untilDestroyed(this)
    );
    selectedLayoutDropdown$ = this.#selectedLayout$.pipe(
        map(this.layoutToDropdown),
        shareReplay({
            bufferSize: 1,
            refCount: false
        }),
        untilDestroyed(this)
    );
    cameras$ = combineLatest([this.selectedLayout$, this.layoutItemLookup$]).pipe(
        map(([{ items }, lookup]) => uniq(items.filter(({ resourceId }) => lookup[resourceId]?.type === 'camera').map(({ resourceId }) => resourceId).sort())),
        untilDestroyed(this)
    );
    recordedTimes$ = this.selectedLayout$.pipe(
        switchMap(() => concat(
            Promise.resolve(null),
            combineLatest([
                this.cameras$, this.selectedSystem$
            ]).pipe(
                switchMap(([cameras, system]) => system.cameraManager.getRecordedTimes(cameras))
            )),
        ),
        untilDestroyed(this)
    );
    constructor(
        configService: NxConfigService,
        private router: Router,
        // private location: Location,
        private systemService: NxSystemService,
        private activatedRoute: ActivatedRoute,
        private accountService: NxAccountService,
        private systemsService: NxSystemsService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.config;
    }

    changeLayout(layout: string | DropdownItem<string>): void {
        const layoutId = typeof layout === 'string' ? cleanId(layout) : layout.value;
        const queryParams = this.activatedRoute.snapshot.queryParams;
        this.router.navigate([`${this.router.url.split('layouts')[0]}layouts/${layoutId}`], { queryParams });
        this.#fetchingLayout$.next('fetching');
        WebRTCStreamManager.updatePosition();
        this.ptzControlTarget = null;
    }

    layoutToDropdown({ name, id }: Resource): DropdownItem<string> {
        return { name, value: cleanId(id) };
    }

    createNewLayout = (systemId: string, parentId: string, name: string): Layout => ({
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.01,
        fixedHeight: 0,
        fixedWidth: 0,
        id: 'new',
        items: [],
        locked: false,
        logicalId: 0,
        name,
        systemId,
        parentId
    });

    createFocusLayout = (systemId: string, id: string): Layout => ({
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.0001,
        fixedHeight: 0,
        fixedWidth: 0,
        id,
        items: [{
            bottom: 1,
            contrastParams: {
                blackLevel: 0.001,
                enabled: false,
                gamma: 1,
                whiteLevel: 0.0005
            },
            controlPtz: false,
            dewarpingParams: {
                enabled: false,
                fov: 1.2217304763960306,
                panoFactor: 1,
                xAngle: 0,
                yAngle: 0
            },
            displayAnalyticsObjects: false,
            displayInfo: false,
            displayRoi: false,
            flags: 1,
            id: `{${id}}`,
            left: 0,
            resourceId: `{${id}}`,
            resourcePath: '',
            right: 1,
            rotation: 0,
            top: 0,
            zoomBottom: 0,
            zoomLeft: 0,
            zoomRight: 0,
            zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
            zoomTop: 0
        }],
        locked: true,
        logicalId: 0,
        name: 'Focus View',
        systemId,
        parentId: this.accountService.account.id
    });

    updateLayout = (layoutId: string): void => {
        this.changeLayout(layoutId);
        this.refreshLayouts$.next(layoutId);
    };
}
