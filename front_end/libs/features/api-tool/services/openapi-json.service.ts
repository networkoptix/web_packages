import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import type { MenuNode } from '@services/menus.service.types';
import {
    LegacyMenuManifest,
    ManifestItem,
    MarkdownItem,
    MenuManifest,
    MenuStructure,
} from '@services/nx-config/base-config';
import { nxConfig } from '@services/nx-config/config';
import { apiTool } from '@static-variables';
import { findMenuNode } from '@utils/nx';

import {
    addAPIInfoNodesToMenu,
    addLegacyAPIInfoNodesToMenu,
    addSeperator,
    generateAPIRouteName,
    generateMenu,
    getFirstNode,
    mergeAPIDocs,
    prepareSwaggerAPIDoc,
    queryInDescription,
} from '../api-file-utils';
import type { APIDoc, APIInfo } from '../api-tool-types';

import {
    APIData,
    Store,
    EmitInfo,
    APIType,
    ServerInfo,
    ReadOnlyAPIStore,
    FetchedJSONs,
    MarkdownIndex,
} from './api-tool-service-types';
import { NxAPIToolSystemService } from './api-tool-system.service';
import { NxReadonlyAPIService } from './readonly-api.service';

@UntilDestroy()
@Injectable()
export class NxOpenAPIJSONService {
    currentAPIDoc$ = new BehaviorSubject<APIDoc | undefined>(undefined);
    currentType$ = new BehaviorSubject<number | undefined>(undefined);
    currentMarkdown: MarkdownIndex | undefined;
    queuedServerChange: string | null = null;
    APIStore: Store<APIData> = {}; // Storing JSONs, API Info (part of jsons), and Menus for developers-menu
    isInfoNode = false; // info nodes don't display swagger routes
    isMarkdownNode = false;
    isReadOnly = false;
    _searchQuery: string = '';
    searchMoreNodes$ = new BehaviorSubject<MenuNodeWithParent[]>([]);
    searchMoreShowing$ = new BehaviorSubject<boolean>(true);

    APITypeEmitter = new Subject<EmitInfo<APIType>>();
    emitAPIType(type: APIType, disabled = false, error = ''): void {
        this.APITypeEmitter.next({ info: type, disabled, error });
    }
    defaultTypeValue = 1;

    get searchQuery() {
        return this._searchQuery;
    }
    set searchQuery(query: string) {
        if (this.searchQuery === query) {
            return;
        }
        this._searchQuery = query;
        this.searchMoreShowing$.next(true);
    }

    get currentAPIDoc() {
        return this.currentAPIDoc$.value;
    }
    set currentAPIDoc(api: APIDoc | undefined) {
        this.currentAPIDoc$.next(api);
    }

    get currentType() {
        return this.currentType$.value;
    }
    set currentType(type: number) {
        this.APIToolService.setQueryParams('type', type.toString());
        this.currentType$.next(type);
    }

    // developers-menu properties
    menuSubject = new BehaviorSubject<MenuStructure>({
        title: 'API', // title and description not used
        description: '', // MenuStructure type is used for compatibility with developers-menu
        nodes: undefined, // undefined triggers preloader
    });

    activeAssetIdSubject = new BehaviorSubject<string>('');
    _activeNode: MenuNodeWithParent;
    activeAssetState = ''; // Not used yet

    get activeNode() {
        return this._activeNode;
    }
    set activeNode(node: MenuNodeWithParent) {
        this.isInfoNode = this.determineIsInfoNode(
            node,
            this.APIToolService.currentSystem && this.APIToolService.currentServerId,
        );
        this.isMarkdownNode = this.determineIsMarkdownNode();
        this._activeNode = node;
    }

    private db = inject(NgxIndexedDBService);

    createCurrentMenuKey() {
        const build = this.APIToolService.currentSystem?.build || nxConfig.system?.version?.minor;
        if (!build) {
            return undefined;
        }
        return ['api-tool-menu', build].join('-');
    }

    get menuNodes() {
        return this.menuSubject.value.nodes;
    }
    set menuNodes(content: MenuNodeWithParent[]) {
        if (content && this.APIToolService.currentSystem) {
            const key = this.createCurrentMenuKey();
            if (key) {
                this.db.update('menuCache', { key, value: content }).subscribe();
            }
        }
        this.menuSubject.next({
            title: 'API',
            description: '',
            nodes: content,
        });
    }

    constructor(
        private APIToolService: NxAPIToolSystemService,
        private readonlyAPIService: NxReadonlyAPIService,
        private router: Router,
    ) {
        this.currentType = parseInt(this.APIToolService.queryParams.type) || this.defaultTypeValue;

        this.APIToolService.serverEmitter$
            .pipe(untilDestroyed(this))
            .subscribe(({ info, disabled, error }) => {
                if (!disabled && !error) {
                    this.handleNewServer(info);
                }
            });

        this.APIToolService.currentServerId$
            .pipe(
                untilDestroyed(this),
                filter(serverID => !!serverID),
            )
            .subscribe(serverID => {
                this.isReadOnly = false;
                if (this.APIStore[serverID]) {
                    this.changeServer(serverID);
                } else {
                    this.queuedServerChange = serverID;
                }
            });

        this.APIToolService.outDatedSystem$
            .pipe(
                untilDestroyed(this),
                filter(outdated => !!outdated),
            )
            .subscribe(() => {
                this.menuNodes = [];
            });
        this.APIToolService.loading$
            .pipe(
                untilDestroyed(this),
                filter(loading => !!loading),
            )
            .subscribe(async () => {
                this.menuNodes = undefined; // trigger preloader
                const key = this.createCurrentMenuKey();
                const cached = key
                    ? await firstValueFrom(this.db.getByKey('menuCache', key))
                          .then((res: { value: MenuNodeWithParent[] }) => res?.value)
                          .catch()
                    : undefined;
                if (cached && !this.menuNodes) {
                    this.menuNodes = cached; // trigger preloader
                }
            });

        this.readonlyAPIService.currentReadonlyAPI$
            .pipe(
                untilDestroyed(this),
                filter(api => !!api),
            )
            .subscribe(api => {
                this.APIToolService.useBrandingVariables(api.api as any);
                this.APIToolService.useBrandingVariables(api.markdown);
                this.setReadonlyAPI(api);
            });

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter(event => event instanceof NavigationEnd),
            )
            .subscribe((event: NavigationEnd) => {
                const urlWithoutQueryParams = event.url.split('?')[0];
                if (this.activeNode && urlWithoutQueryParams !== this.activeNode.url) {
                    this.navigateToMenuNodeFromURL();
                }
            });
    }

    async handleNewServer(serverInfo: ServerInfo): Promise<void> {
        let { server, markdown } = serverInfo;
        const manifest = (await this.APIToolService.getMenuManifest()) as MenuManifest;
        const manifestJSONScheme: ManifestItem[] =
            manifest?.versions || (manifest as unknown as LegacyMenuManifest);
        const jsons = this.fetchAllJSONsInManifest(manifestJSONScheme);
        this.createAPIStore(server.id);
        if (!markdown && this.APIToolService.isRestAPI(server.id)) {
            // markdown not in cache and not legacy system
            const docs: MarkdownItem[] = manifest?.docs || apiTool.defaultDocs;
            markdown = await this.APIToolService.getMarkdownFiles(docs);
        }
        if (markdown) {
            this.APIToolService.useBrandingVariables(markdown);
            this.storeMarkdown(server.id, markdown);
        }
        let combinedJSONCreated = false;
        let combinedJSON: APIDoc = {} as APIDoc;
        for (let i = 0; i < manifestJSONScheme.length; i++) {
            const item = manifestJSONScheme[i];
            const type = i + 1;
            const menu: MenuNodeWithParent[] = [];
            for (const section of item.sections) {
                if (section.name) {
                    addSeperator(menu, section.name);
                }
                const json = cloneDeep(await jsons[section.scheme]);
                prepareSwaggerAPIDoc(json, type);
                if (!combinedJSONCreated) {
                    combinedJSONCreated = true;
                    combinedJSON = json;
                    this.storeAPIJson(server.id, json);
                } else {
                    mergeAPIDocs(combinedJSON, json);
                }
                generateMenu(menu, json);
            }
            this.emitAPIType({ type, displayName: item.name });
            this.storeAPIInfo(server.id, type, combinedJSON?.info);
            this.storeAPIMenu(server.id, type, menu);
            if (this.APIToolService.isRestAPI(server.id)) {
                const docs: MarkdownItem[] = manifest?.docs || apiTool.defaultDocs;
                addAPIInfoNodesToMenu(docs, menu);
            } else {
                addLegacyAPIInfoNodesToMenu(combinedJSON, menu);
            }
        }
        this.APIToolService.useBrandingVariables(combinedJSON as any);

        if (this.queuedServerChange === server.id) {
            // Handles race condition where the currentServer is changed to this server before it is ready to display
            this.changeServer(server.id);
            this.queuedServerChange = null;
        }
    }

    /**
     * Returns an object that maps routes -> promises
     * The purpose is to trigger a fetch for each needed JSON simultaneously
     */
    fetchAllJSONsInManifest(manifest: ManifestItem[]) {
        const jsons: FetchedJSONs = {};
        for (const item of manifest) {
            for (const section of item.sections) {
                if (!jsons[section.scheme]) {
                    // Avoids duplicate requests
                    jsons[section.scheme] = this.APIToolService.fetchJSON(section.scheme);
                }
            }
        }
        return jsons;
    }

    changeServer(serverID: string): void {
        const API = this.APIStore[serverID];
        const queryparamsType = this.APIToolService.queryParams?.type;
        const type = API.menus[queryparamsType] ? queryparamsType : this.defaultTypeValue;
        this.APIToolService.setQueryParams('type', type);
        this.currentType = parseInt(type);
        this.currentAPIDoc = API.json;
        this.currentMarkdown = API.markdown;
        this.setMenuNodes(API.menus[type]);
    }

    setReadonlyAPI = (readonlyAPI: ReadOnlyAPIStore): void => {
        const _manifest = JSON.parse(readonlyAPI.api.manifest) as LegacyMenuManifest | MenuManifest;
        const manifest = Array.isArray(_manifest) ? _manifest : _manifest.versions;
        for (let i = 0; i < manifest.length; i++) {
            const apiType = { displayName: manifest[i].name, type: i + 1 };
            this.emitAPIType(apiType);
        }
        this.isReadOnly = true;
        this.currentAPIDoc = readonlyAPI.api.content;
        this.currentMarkdown = readonlyAPI.markdown;
        this.setMenuNodes(readonlyAPI.menus[1]);
    };

    setMenuNodes = (menu: MenuNodeWithParent[]): void => {
        if (menu) {
            this.menuNodes = menu;
            this.activeNode = getFirstNode(this.menuNodes);
            this.navigateToMenuNodeFromURL();
        }
    };

    createAPIStore(serverID: string): void {
        this.APIStore[serverID] = {
            json: {} as APIDoc,
            menus: {},
            infos: {},
        };
    }

    storeAPIJson(serverID, json: APIDoc): void {
        this.APIStore[serverID].json = json;
    }

    storeAPIInfo(serverID: string, APIType: string | number, APIInfo: APIInfo | undefined): void {
        if (APIInfo?.description) {
            const { title, description, version } = APIInfo;
            this.APIStore[serverID].infos[APIType] = { title, description, version };
        }
    }

    storeMarkdown(serverID: string, markdown: MarkdownIndex): void {
        this.APIStore[serverID].markdown = markdown;
    }

    storeAPIMenu(serverID: string, APIType: string | number, menu: MenuNodeWithParent[]): void {
        this.APIStore[serverID].menus[APIType] = menu;
    }

    /** Modify the current JSON's info property with the currently displayed type's info
     *
     *  Required so that swagger displays the correct info.
     */
    setAPIInfo = (info: APIInfo): void => {
        if (this.currentAPIDoc) {
            this.currentAPIDoc.info = info;
        }
    };

    setAPIType = (serverID: string | undefined, type: number): void => {
        this.currentType = type;
        const isSystem = !!serverID;
        const store = isSystem ? this.APIStore : this.readonlyAPIService.readonlyAPIStore;
        const storedAPI = store[serverID || this.readonlyAPIService.currentReadonlyAPI?.api.id];
        const menu = storedAPI.menus[type];
        if (isSystem) {
            const info = (storedAPI as APIData).infos[type];
            this.setAPIInfo(info);
        }
        this.setMenuNodes(menu);
        this.activeNode = getFirstNode(this.menuNodes);
    };

    determineIsInfoNode = (node: MenuNodeWithParent, serverID: string) => {
        if (this.APIStore[serverID]?.markdown) {
            const markdownStore = this.APIStore[serverID].markdown as MarkdownIndex;
            return !!markdownStore[node.name];
        }
        if (this.readonlyAPIService.currentReadonlyAPI?.markdown) {
            const markdownStore = this.readonlyAPIService.currentReadonlyAPI.markdown;
            return !!markdownStore[node.name];
        }
        return false;
    };

    determineIsMarkdownNode = () => {
        return this.isInfoNode && !!this.currentMarkdown;
    };

    navigateToMenuNodeFromURL = (): void => {
        if (this.menuNodes) {
            const url = decodeURIComponent(decodeURIComponent(this.router.url.split('?')[0]));
            const urlIsEqual = (node: MenuNode) => {
                return node.url === url;
            };
            const activeNode = findMenuNode(this.menuNodes, urlIsEqual);
            if (activeNode) {
                this.activeNode = activeNode;
                this.menuNodes = this.menuSubject.value.nodes; // trigger change detection;
            }
        }
    };

    searchAPIDoc(): void {
        const searchMoreNodes: MenuNodeWithParent[] = [];
        if (this.currentAPIDoc) {
            for (const path of Object.keys(this.currentAPIDoc.paths)) {
                const route = this.currentAPIDoc.paths[path];
                for (const requestType of Object.keys(route)) {
                    if (queryInDescription(route[requestType], this.searchQuery)) {
                        const tag = generateAPIRouteName(path, requestType);
                        const node = findMenuNode(
                            this.menuSubject.value.nodes,
                            node => node.name === tag,
                        );
                        if (node) {
                            searchMoreNodes.push(node);
                        }
                    }
                }
            }
        }
        this.searchMoreNodes$.next(searchMoreNodes);
    }

    clickSearchMore(): void {
        this.searchAPIDoc();
        this.searchMoreShowing$.next(false);
    }
}
