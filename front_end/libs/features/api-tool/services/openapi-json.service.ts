import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import type { MenuNode } from '@services/menus.service.types';
import { MenuManifest, MenuStructure } from '@services/nx-config/base-config';
import { findMenuNode } from '@utils/nx';

import {
    addAPIInfoNodesToMenu,
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
    MarkdownObj,
    FetchedJSONs,
} from './api-tool-service-types';
import { NxAPIToolSystemService } from './api-tool-system.service';
import { NxReadonlyAPIService } from './readonly-api.service';

@UntilDestroy()
@Injectable()
export class NxOpenAPIJSONService {
    currentAPIDoc$ = new BehaviorSubject<APIDoc>(null);
    currentType$ = new BehaviorSubject<number>(null);
    currentMarkdown: MarkdownObj;
    queuedServerChange: string = null;
    APIStore: Store<APIData> = {}; // Storing JSONs, API Info (part of jsons), and Menus for developers-menu
    APIInfoNodes = ['APIInformation', 'APIPreamble', 'APIChangelog'];
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
    set currentAPIDoc(api: APIDoc) {
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
        nodes: undefined // undefined triggers preloader
    });

    activeAssetIdSubject = new BehaviorSubject<string>('');
    _activeNode: MenuNodeWithParent;
    activeAssetState = ''; // Not used yet

    get activeNode() {
        return this._activeNode;
    }
    set activeNode(node: MenuNodeWithParent) {
        this.isInfoNode = this.determineIsInfoNode(node);
        this.isMarkdownNode = this.determineIsMarkdownNode();
        this._activeNode = node;
    }

    get menuNodes() {
        return this.menuSubject.value.nodes;
    }
    set menuNodes(content: MenuNodeWithParent[]) {
        this.menuSubject.next({
            title: 'API',
            description: '',
            nodes: content
        });
    }

    constructor(private APIToolService: NxAPIToolSystemService,
                private readonlyAPIService: NxReadonlyAPIService,
                private router: Router) {
        this.currentType = parseInt(this.APIToolService.queryParams.type) || this.defaultTypeValue;

        this.APIToolService.serverEmitter$.pipe(untilDestroyed(this)).subscribe(({ info, disabled, error }) => {
            if (!disabled && !error) {
                this.handleNewServer(info);
            }
        });

        this.APIToolService.currentServerId$.pipe(untilDestroyed(this), filter(serverID => !!serverID)).subscribe(serverID => {
            this.isReadOnly = false;
            if (this.APIStore[serverID]) {
                this.changeServer(serverID);
            } else {
                this.queuedServerChange = serverID;
            }
        });

        this.APIToolService.outDatedSystem$.pipe(untilDestroyed(this), filter(outdated => !!outdated)).subscribe(() => {
            this.menuNodes = [];
        });
        this.APIToolService.loading$.pipe(untilDestroyed(this), filter(loading => !!loading)).subscribe(() => {
            this.menuNodes = undefined; // trigger preloader
        });

        this.readonlyAPIService.currentReadonlyAPI$.pipe(untilDestroyed(this), filter(api => !!api)).subscribe(api => {
            this.APIToolService.useBrandingVariables(api.api);
            this.APIToolService.useBrandingVariables(api.markdown);
            this.setReadonlyAPI(api);
        });

        this.router.events.pipe(untilDestroyed(this), filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            const urlWithoutQueryParams = event.url.split('?')[0];
            if (this.activeNode && urlWithoutQueryParams !== this.activeNode.url) {
                this.navigateToMenuNodeFromURL();
            }
        });
    }

    async handleNewServer(serverInfo: ServerInfo): Promise<void> {
        const { server, markdown } = serverInfo;
        const manifest = await this.APIToolService.getMenuManifest();
        const jsons = this.fetchAllJSONsInManifest(manifest);
        this.createAPIStore(server.id);
        if (markdown) {
            this.APIToolService.useBrandingVariables(markdown);
            this.storeMarkdown(server.id, markdown);
        }
        let combinedJSON: APIDoc;
        for (let i = 0; i < manifest.length; i++) {
            const item = manifest[i];
            const type = i + 1;
            const menu: MenuNodeWithParent[] = [];
            for (const section of item.sections) {
                if (section.name) {
                    addSeperator(menu, section.name);
                }
                const json = cloneDeep(await jsons[section.scheme]);
                prepareSwaggerAPIDoc(json, type);
                if (!combinedJSON) {
                    combinedJSON = json;
                    this.storeAPIJson(server.id, json);
                } else {
                    mergeAPIDocs(combinedJSON, json);
                }
                generateMenu(menu, json);
            }
            this.emitAPIType({ type, displayName: item.name });
            this.storeAPIInfo(server.id, type, combinedJSON.info);
            this.storeAPIMenu(server.id, type, menu);
            addAPIInfoNodesToMenu(combinedJSON, menu, !!markdown);
        }
        this.APIToolService.useBrandingVariables(combinedJSON);

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
    fetchAllJSONsInManifest(manifest: MenuManifest) {
        const jsons: FetchedJSONs = {};
        for (const item of manifest) {
            for (const section of item.sections) {
                if (!jsons[section.scheme]) { // Avoids duplicate requests
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
        this.currentMarkdown = API.markdown || null;
        this.setMenuNodes(API.menus[type]);
    }

    setReadonlyAPI = (readonlyAPI: ReadOnlyAPIStore): void => {
        const manifest = JSON.parse(readonlyAPI.api.manifest) as MenuManifest;
        for (let i = 0; i < manifest.length; i++) {
            const apiType = { displayName: manifest[i].name, type: i + 1 };
            this.emitAPIType(apiType);
        }
        this.isReadOnly = true;
        this.currentAPIDoc = readonlyAPI.api.content;
        this.currentMarkdown = readonlyAPI.markdown || null;
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
            infos: {}
        };
    }

    storeAPIJson(serverID, json: APIDoc): void {
        this.APIStore[serverID].json = json;
    }

    storeAPIInfo(serverID: string, APIType: string | number, APIInfo: APIInfo): void {
        if (APIInfo?.description) {
            const { title, description, version } = APIInfo;
            this.APIStore[serverID].infos[APIType] = { title, description, version };
        }
    }

    storeMarkdown(serverID: string, markdown: MarkdownObj): void {
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
        this.currentAPIDoc.info = info;
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

    determineIsInfoNode = (node: MenuNodeWithParent) => {
        return this.APIInfoNodes.includes(node.name);
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

    searchAPIDoc() {
        const searchMoreNodes: MenuNodeWithParent[] = [];
        for (const path of Object.keys(this.currentAPIDoc.paths)) {
            const route = this.currentAPIDoc.paths[path];
            for (const requestType of Object.keys(route)) {
                if (queryInDescription(route[requestType], this.searchQuery)) {
                    const tag = generateAPIRouteName(path, requestType);
                    const node = findMenuNode(this.menuSubject.value.nodes, node => node.name === tag);
                    if (node) {
                        searchMoreNodes.push(node);
                    }
                }
            }
        }
        this.searchMoreNodes$.next(searchMoreNodes);
        this.searchMoreShowing$.next(false);
    }
}
