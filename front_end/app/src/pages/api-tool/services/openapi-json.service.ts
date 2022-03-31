import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import type { MenuNode } from '@services/menus.service.types';
import { APIDocType, MenuStructure } from '@services/nx-config/base-config';
import { findMenuNode } from '@utils/nx';

import { addAPIInfoNodesToMenu, addSeperatedAPIMenu, createMenuContent, mergeAPIDocs, prepareSwaggerAPIDoc } from '../api-file-utils';
import type { APIDoc, APIInfo } from '../api-tool-types';

import { APIData, Store, EmitInfo, APIType, ServerInfo, ReadonlyAPI, Markdown } from './api-tool-service-types';
import { NxAPIToolSystemService } from './api-tool-system.service';
import { NxReadonlyAPIService } from './readonly-api.service';

@UntilDestroy()
@Injectable()
export class NxOpenAPIJSONService {
    currentAPIDoc$ = new BehaviorSubject<APIDoc>(null);
    currentType$ = new BehaviorSubject<string>(null);
    currentMarkdown: Markdown;
    queuedServerChange: string = null;
    APIStore: Store<APIData> = {}; // Storing JSONs, API Info (part of jsons), and Menus for developers-menu
    APITypes: { [key: string]: APIType } = {
        main: {
            type: 'main',
            displayName: 'Current Version'
        },
        deprecated: {
            type: 'deprecated',
            displayName: 'Deprecated'
        }
    };
    APIInfoNodes = ['APIInformation', 'APIPreamble', 'APIChangelog'];
    isInfoNode = false; // info nodes don't display swagger routes
    isMarkdownNode = false;
    isReadOnly = false;

    APITypeEmitter = new Subject<EmitInfo<APIType>>();
    emitAPIType(type: APIType, disabled = false, error = '') {
        this.APITypeEmitter.next({ info: type, disabled, error });
    }

    get currentAPIDoc() { return this.currentAPIDoc$.value; }
    set currentAPIDoc(api: APIDoc) { this.currentAPIDoc$.next(api); }

    get currentType() { return this.currentType$.value; }
    set currentType(type: string) {
        this.APIToolService.setQueryParams('type', type);
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

    get activeNode() { return this._activeNode; }
    set activeNode(node: MenuNodeWithParent) {
        this.isInfoNode = this.determineIsInfoNode(node);
        this.isMarkdownNode = this.determineIsMarkdownNode();
        this._activeNode = node;
    }

    get menuNodes() { return this.menuSubject.value.nodes; }
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
        this.currentType = this.APIToolService.queryParams.type || 'main';

        this.APIToolService.serverEmitter$.pipe(untilDestroyed(this)).subscribe(serverInfo => {
            if (!serverInfo.disabled && !serverInfo.error) {
                this.handleNewServer(serverInfo.info);
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
            this.setReadonlyAPI(api);
        });
    }

    async handleNewServer(serverInfo: ServerInfo) {
        const { json, server, markdown } = serverInfo;
        const main = this.APITypes.main;
        this.createAPIStore(server.id, json);
        prepareSwaggerAPIDoc(json, 'main');
        const mainContent = createMenuContent(json);
        this.emitAPIType(main);
        this.storeAPIInfo(server.id, main.type, json.info);
        if (markdown) {
            this.storeMarkdown(server.id, markdown);
        }
        addAPIInfoNodesToMenu(json, mainContent, !!markdown);

        const { legacyAPI, deprecatedAPI } = await this.APIToolService.getLegacyAPIDocs(server.id);

        if (legacyAPI) { // Legacy API is included in the main API menu with a seperator
            prepareSwaggerAPIDoc(legacyAPI, 'legacy');
            mergeAPIDocs(json, legacyAPI);
            addSeperatedAPIMenu(legacyAPI, mainContent, 'LEGACY');
        }
        this.storeAPIMenu(server.id, main.type, mainContent);

        if (deprecatedAPI) { // Deprecated API is a seperate menu
            const deprecatedType = this.APITypes.deprecated;
            prepareSwaggerAPIDoc(deprecatedAPI, deprecatedType.type as APIDocType);
            mergeAPIDocs(json, deprecatedAPI);
            const deprecatedMenu = createMenuContent(deprecatedAPI);
            this.emitAPIType(deprecatedType);
            this.storeAPIMenu(server.id, deprecatedType.type, deprecatedMenu);
            this.storeAPIInfo(server.id, deprecatedType.type, deprecatedAPI.info);
        }

        if (this.queuedServerChange === server.id) {
            // Handles race condition where the currentServer is changed to this server before it is ready to display
            // because it is waiting on legacy and deprecated API calls
            this.changeServer(server.id);
            this.queuedServerChange = null;
        }
    }

    changeServer(serverID: string) {
        const API = this.APIStore[serverID];
        const queryparamsType = this.APIToolService.queryParams?.type;
        const type = API.menus[queryparamsType] ? queryparamsType : this.APITypes.main.type;
        this.APIToolService.setQueryParams('type', type);
        this.currentType = type;
        this.currentAPIDoc = API.json;
        this.currentMarkdown = API.markdown || null;
        this.setMenuNodes(API.menus[type]);
    }

    setReadonlyAPI = (readonlyAPI: ReadonlyAPI) => {
        this.isReadOnly = true;
        this.currentAPIDoc = readonlyAPI.api.content;
        this.setMenuNodes(readonlyAPI.menu);
        addAPIInfoNodesToMenu(this.currentAPIDoc, readonlyAPI.menu);
    };

    setMenuNodes = (menu: MenuNodeWithParent[]) => {
        this.menuNodes = menu;
        this.activeNode = this.menuNodes[0];
        this.navigateToMenuNodeFromURL();
    };

    createAPIStore(serverID: string, api: APIDoc) {
        this.APIStore[serverID] = {
            json: api,
            menus: {},
            infos: {}
        };
    }

    storeAPIInfo(serverID: string, APIType: string, APIInfo: APIInfo) {
        if (APIInfo?.description) {
            const { title, description, version } = APIInfo;
            this.APIStore[serverID].infos[APIType] = { title, description, version };
        }
    }

    storeMarkdown(serverID: string, markdown: Markdown) {
        this.APIStore[serverID].markdown = markdown;
    }

    storeAPIMenu(serverID: string, APIType: string, menu: MenuNodeWithParent[]) {
        this.APIStore[serverID].menus[APIType] = menu;
    }

    /** Modify the current JSON's info property with the currently displayed type's info
     *
     *  Required so that swagger displays the correct info.
     */
    setAPIInfo = (info: APIInfo) => {
        this.currentAPIDoc.info = info;
    };

    setAPIType = (serverID, type) => {
        this.currentType = type;
        const storedAPI = this.APIStore[serverID];
        const menu = storedAPI.menus[type];
        const info = storedAPI.infos[type];

        this.setAPIInfo(info);
        this.setMenuNodes(menu);
    };

    determineIsInfoNode = (node: MenuNodeWithParent) => {
        return this.APIInfoNodes.includes(node.name);
    };

    determineIsMarkdownNode = () => {
        return this.isInfoNode && !!this.currentMarkdown;
    };

    navigateToMenuNodeFromURL = () => {
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
}
