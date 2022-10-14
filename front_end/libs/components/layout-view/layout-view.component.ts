// import { Location } from '@angular/common';
import {
    Component
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, merge, Observable, Subject } from 'rxjs';
import { map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { LayoutResourceTree, ResourceNode } from '@components/layout-grid/layout-grid.types';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Layouts, Layout, WebPages } from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { cleanId, paramSortFunc } from '@utils/general';

interface Resource {
    name: string;
    id: string;
}

interface ResourceLookup<T = { id: string }> {
    [id: string]: ResourceNode<T>
}

@Component({
    selector: 'nx-layout-view',
    templateUrl: 'layout-view.component.html',
    styleUrls: ['layout-view.component.scss']
})

export class NxLayoutViewComponent {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

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
            refCount: true
        })
    );

    layoutItemLookup$ = this.selectedSystem$.pipe(
        switchMap(({ mediaserver, serverManager, cameraManager }) => combineLatest([
            cameraManager.getCameras(),
            serverManager.getServers(),
            mediaserver instanceof NxSystemRestAPI ? mediaserver.getWebPages() : Promise.resolve([] as WebPages),
            this.#selectedLayout$,
            this.availableLayouts$
        ])),
        map(([cameras, servers, webPages, { cellAspectRatio: aspectRatio }, layouts]): LayoutResourceTree => {
            const parsedCameras = cameras.reduce((cameras, camera) => ({
                ...cameras,
                [camera.id]: {
                    type: 'camera',
                    name: camera.name,
                    details: camera,
                    aspectRatio: +camera.overrideAr || camera.defaultRatio || aspectRatio
                }
            }), {} as ResourceLookup<typeof cameras[0]>);

            const parsedServers = servers.reduce((servers, server) => ({
                ...servers,
                [server.id]: {
                    type: 'server',
                    name: server.name,
                    details: server,
                    aspectRatio
                }
            }), {} as ResourceLookup<typeof servers[0]>);

            const parsedWebPages = webPages.reduce((webPages, webPage) => ({
                ...webPages,
                [webPage.id]: {
                    type: 'webPage',
                    name: webPage.name,
                    details: webPage,
                    aspectRatio
                }
            }), {} as ResourceLookup<typeof webPages[0]>);
            const byName = paramSortFunc<Pick<Resource, 'name'>>(r => r.name);
            const parsedResources = { ...parsedServers, ...parsedCameras, ...parsedWebPages };
            const serversForTree = Object.values(parsedServers).sort(byName);
            const camerasForTree = Object.values(parsedCameras).sort(byName);
            const webPagesForTree = Object.values(parsedWebPages).sort(byName);
            const layoutsForTree = layouts.filter(({ id }) => !!id).map(({ name, id, items = [] }) => ({
                name,
                id,
                children: items.map(({ resourceId }) => ({
                    id,
                    ...parsedResources[resourceId]
                })).sort(byName)
            }));

            return {
                tree: [
                    {
                        name: 'Layouts',
                        children: layoutsForTree
                    },
                    {
                        name: 'Servers',
                        children: serversForTree.map(server => ({
                            ...server,
                            children: camerasForTree.filter(({ details: { parentId } }) => parentId === server.details.id)
                        }))
                    },
                    {
                        name:
                            'Cameras',
                        children: camerasForTree
                    },
                    {
                        name: 'Web Pages',
                        children: webPagesForTree
                    },
                ],
                ...parsedResources
            };
        })
    );
    availableLayouts$: Observable<Layouts> = this.refreshLayouts$.pipe(
        switchMap(_ => this.selectedSystem$),
        switchMap(async ({
            mediaserver,
            id: systemId,
            userManager: {
                currentUser: {
                    id: userId
                }
            }
        }) => [
            ...(mediaserver instanceof NxSystemRestAPI ? await mediaserver.getLayouts().toPromise() : []),
            this.createNewLayout(systemId, userId)
        ]),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );
    availableLayoutsDropdown$ = this.availableLayouts$.pipe(
        map(layouts => layouts.map(this.layoutToDropdown)));
    #selectedLayout$ = combineLatest([
        this.selectedSystem$,
        this.activatedRoute.params,
        this.availableLayouts$
    ]).pipe(
        switchMap(([system, { layoutId }, layouts]) => {
            if (layoutId === 'new') {
                return Promise.resolve(layouts[layouts.length - 1]);
            } else if (layoutId && system.mediaserver instanceof NxSystemRestAPI) {
                const existingLayout = layouts.find(({ id }) => cleanId(id) === layoutId);

                return system.mediaserver.getLayout(layoutId).pipe(
                    startWith(existingLayout),
                    map((layout: Layout): Layout => ({ systemId: system.id, ...layout }))
                );
            }
            return Promise.resolve();
        }),
        switchMap(layout => layout ? Promise.resolve([layout]) : this.availableLayouts$),
        map(layouts => layouts[0]),
        tap(({ id }) => {
            const selectedLayoutId = cleanId(id);
            if (selectedLayoutId && selectedLayoutId !== this.activatedRoute.snapshot.params.layoutId) {
                this.changeLayout(selectedLayoutId);
            }
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );
    #fetchingLayout$: Subject<'fetching'> = new Subject();
    selectedLayout$ = merge(
        this.#selectedLayout$,
        this.#fetchingLayout$
    ).pipe(
        map(current => current === 'fetching' ? null : current)
    );
    selectedLayoutDropdown$ = this.#selectedLayout$.pipe(
        map(this.layoutToDropdown),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );
    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private router: Router,
        // private location: Location,
        private systemService: NxSystemService,
        private activatedRoute: ActivatedRoute,
        private accountService: NxAccountService,
        private systemsService: NxSystemsService
    ) {

    }

    changeLayout(layout: string | DropdownItem<string>): void {
        const layoutId = typeof layout === 'string' ? cleanId(layout) : layout.value;
        this.#fetchingLayout$.next('fetching');
        this.router.navigateByUrl(`${this.router.url.split('layouts')[0]}layouts/${layoutId}`);
    }

    layoutToDropdown({ name, id }: Resource): DropdownItem<string> {
        return { name, value: cleanId(id) };
    }

    createNewLayout = (systemId: string, parentId: string): Layout => ({
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.05000000074505806,
        fixedHeight: 0,
        fixedWidth: 0,
        id: 'new',
        items: [],
        locked: false,
        logicalId: 0,
        name: 'Create New Layout',
        systemId,
        parentId
    });

    updateLayout = (layoutId: string): void => {
        this.refreshLayouts$.next('update');
        this.changeLayout(layoutId);
    };
}
