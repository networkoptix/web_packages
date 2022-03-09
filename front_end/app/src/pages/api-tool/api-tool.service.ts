import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
    delay,
    distinctUntilChanged,
    filter,
    finalize,
    map,
    retryWhen,
    take
} from 'rxjs/operators';

import type {
    ClickEvent, MenuNodeWithParent
} from '@components/developers-menu/developers-menu-types';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { MenuNode } from '@services/menus.service.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { OpenAPIJSON } from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService } from '@services/nx-config';
import { APIDocVersion, MenuStructure } from '@services/nx-config/base-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem, NxSystemService } from '@services/system.service';
import { NxSystemWithUserInfo, NxSystemsService } from '@services/systems.service';
import { NxUriService } from '@services/uri.service';
import { NxUtilsService } from '@services/utils.service';

import {
    modifyPathTags,
    modifyTagNames,
    createMenuContent,
    prepareSwaggerAPIDoc,
    removeProprietaryEndpoints,
    addSeperatedAPI,
    addAPIInfoNodesToMenu
} from './api-file-utils';
import type {
    APIDoc,
    APIDropdownItem,
    APIInfo,
    APIInfoStore,
    ServerDropdownItem,
    SystemDropdownItem
} from './api-tool-types';

/** Provides the currently selected system and server. Also provides the content for the left menu.   */
@UntilDestroy()
@Injectable()
export class NxAPIToolService {
    CONFIG: IConfig;

    systems: NxSystemWithUserInfo[];
    systemsDropdown: SystemDropdownItem[] = [];
    _selectedSystem: SystemDropdownItem;
    system: NxSystem;
    systemVersion: Number = 5.0;
    mediaServerUpdating = false;
    mediaServerErrorCount = 0;
    mediaServerErrorCountLimit = 4;
    validSystems: NxSystemWithUserInfo[] = []

    serversDropdown: ServerDropdownItem[] = [];
    selectedServer: ServerDropdownItem;
    serversLoaded$ = new BehaviorSubject(false);
    private serverSubscription: Subscription;

    displayedAPI: APIDoc;
    isReadOnly = false;
    readonlyAPIsEnabled = false;
    APIDropdown: APIDropdownItem[] = [];
    _selectedAPI: APIDropdownItem;
    queryParams: any;
    preventNextChangeDetection = false;

    // developers-menu properties
    menuSubject = new BehaviorSubject<MenuStructure>({
        title: 'API',      // title and description not used
        description: '',   // MenuStructure type is used for compatibility with developers-menu
        nodes: undefined   // undefined triggers preloader
    });

    activeAssetIdSubject = new BehaviorSubject<string>('');
    activeNode: MenuNodeWithParent;
    activeAssetState = ''; // Not used yet

    APIInfoStore: APIInfoStore = {} as APIInfoStore
    markdownStore: any = {}
    APIInfoNodes = {
        api_information: 'API Information',
        api_changelog: 'API Changelog',
        legacy: 'Legacy API',
        deprecated: 'Deprecated Endpoints'
    }

    APIInfoLegacyNodes = {
        api_information_legacy: 'API Information',
    }

    loadingFailure$ = new BehaviorSubject(false); // Errors that redirect to a placeholder page.
    loadingErrorType: '' | 'NO_SYSTEM_FOUND_API_TOOL' | 'SYSTEM_FAILED_TO_LOAD_API_TOOL' = ''
    outDatedSystem = false;

    constructor(
        configService: NxConfigService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private headerService: NxHeaderService,
        private _route: ActivatedRoute,
        private router: Router,
        private api: NxCloudApiService,
        private uri: NxUriService) {
        this.readonlyAPIsEnabled = configService.flagsEnabled('readonlyAPIs');
        this.CONFIG = configService.getConfig();
        this.systems = this.systemsService.systems || [];

        this._route.queryParams.pipe(untilDestroyed(this)).subscribe((params) => {
            this.queryParams = params;
        });
        this.accountService.get().then(account => {
            if (!account) {
                this.getSystem();
            }
        });
        if (!this.systems.length) {
            this.systemsService.systemsSubject
                .pipe(
                    distinctUntilChanged((a, b) => NxUtilsService.isEqual(a, b)),
                    untilDestroyed(this))
                .subscribe((systems) => {
                    this.systems = systems;
                    this.getSystem();
                });
        } else {
            this.getSystem();
        }
    }

    set menuNodes(content: MenuNodeWithParent[]) {
        this.menuSubject.next({
            title: 'API',
            description: '',
            nodes: content
        });
    }

    get menuNodes() {
        return this.menuSubject.value.nodes;
    }

    set selectedAPI(version: APIDropdownItem) {
        const queryParams = this.getQueryParams();
        queryParams.version = version?.name?.toLowerCase() || '';
        this.queryParams = queryParams;
        this.uri.updateURI(this.uri.getURL(), queryParams);
        this._selectedAPI = version;
    }

    get selectedAPI() {
        return this._selectedAPI;
    }

    set selectedSystem(system: SystemDropdownItem) {
        if (!environment.isLocal) {
            const queryParams = this.getQueryParams();
            const id = NxUtilsService.isUUID(system.value) ? system.value : system.value.id;
            queryParams.system = id;
            this.queryParams = queryParams;
            this.uri.updateURI(this.uri.getURL(), queryParams);
        }
        this._selectedSystem = system;
    }

    get selectedSystem() {
        return this._selectedSystem;
    }

    getQueryParams = () => {
        // original queryparams object is not modifiable
        const queryParams: Params = {};
        for (const key in this.queryParams) {
            queryParams[key] = this.queryParams[key];
        }
        return queryParams;
    }

    isRestAPI(serverID = this.selectedServer.value) {
        // REST API servers are 5.0 and above
        return this.system.serverManager.mediaserverConnections[serverID] instanceof NxSystemRestAPI;
    }

    isAPIInfoMenuNode = (menuNode: MenuNodeWithParent) => {
        return !!this.APIInfoNodes[menuNode.name] || !!this.APIInfoLegacyNodes[menuNode.name];
    }

    addAPIDescription(apiName: string, responseInfo: APIInfo) {
        if (responseInfo && responseInfo.description) {
            this.APIInfoStore[apiName] = {
                title: responseInfo.title,
                description: responseInfo.description,
                version: responseInfo.version
            };
        }
    }

    handleMenuClick = (click: ClickEvent) => {
        if (this.APIInfoNodes[click.node.name]) {
            this.setAPIInfo();
        }
        this.activeNode = click.node;
    }

    setAPIInfo = () => {
        this.displayedAPI.info = this.APIInfoStore[this.selectedAPI.value];
    }

    systemIsOnline = (system: NxSystemWithUserInfo) => system.stateOfHealth === 'online';

    makeSystemName = (system) => {
        const name = system.info?.name || system.name || 'System';
        const version = system.info?.version || system.version || '';
        const versionString = version ? ' (' + version + ')' : '';
        return name + versionString;
    }

    makeReadonlyAPIName = (api: OpenAPIJSON) => {
        const name = api.name;
        const version = api.version ? ' v. ' + api.version : '';

        return name + version;
    }

    async getSystem() {
        await this.generateSystemsDropdown();
        if (this.queryParams.system && !NxUtilsService.isUUID(this.queryParams.system)) {
            const readonlyAPI = this.systemsDropdown.find(item => {
                return item.value.id === parseInt(this.queryParams.system);
            });
            if (readonlyAPI) {
                this.selectedSystem = readonlyAPI;
                this.makeReadOnlyAPI();
                return;
            }
        }
        const cachedSystem = this.systemService.getCurrentSystem();
        if (environment.isLocal) {
            await this.accountService.get().then((account) => {
                if (!account) {
                    this.router.navigate(['/']);
                }
                this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            });
        } else if (cachedSystem) {
            this.system = cachedSystem;
            this.selectedSystem = { value: this.system.id, name: this.makeSystemName(this.system), disabled: false, icon: this.CONFIG.icons.dirTextButtons + 'storage_cloud.svg' };
        } else {
            let validSystem: NxSystemWithUserInfo;
            if (this.queryParams.system) {
                validSystem = this.systems.find(system => this.systemIsOnline(system) && system.id === this.queryParams.system);
            }
            if (!validSystem) {
                validSystem = this.headerService.lastActive && this.systemIsOnline(this.headerService.lastActive)
                    ? this.headerService.lastActive : this.systems.find(system => this.systemIsOnline(system));
            }
            if (validSystem) {
                this.system = await this.systemService.createSystem('', validSystem.id);
            } else {
                const readonlyAPI = this.systemsDropdown.find(item => !NxUtilsService.isUUID(item.value) && item.name !== 'seperator');
                if (readonlyAPI) {
                    this.selectedSystem = readonlyAPI;
                    this.makeReadOnlyAPI();
                    return;
                }
                this.showError();
                return;
            }
        }
        this.handleSystemChange();
    }

    showError = () => {
        this.loadingFailure$.next(true);
        this.loadingErrorType = environment.isLocal || this.systemsDropdown.length === 1 ? 'SYSTEM_FAILED_TO_LOAD_API_TOOL' : 'NO_SYSTEM_FOUND_API_TOOL';
        this.serverSubscription?.unsubscribe();
    }

    async tryNextSystem() {
        if (!this.CONFIG.isLocal) {
            const invalidSystemItem = this.systemsDropdown.find(item => item.value === this.system.id);
            invalidSystemItem.name = invalidSystemItem.name + ' - Error';
            invalidSystemItem.disabled = true;
        }
        this.validSystems = this.validSystems.filter(system => system.id !== this.system.id);

        if (this.validSystems.length) {
            this.system = await this.systemService.createSystem('', this.validSystems[0].id);
            this.getServersInfo();
            return;
        }
        const readonlyAPI = this.systemsDropdown.find(item => !!item.json);
        if (readonlyAPI) {
            return;
        }
        // No more valid systems left
        this.showError();
    }

    getServersInfo() {
        this.serversLoaded$.next(false);
        if (this.serverSubscription) {
            this.serverSubscription.unsubscribe();
        }
        this.serverSubscription = this.system.infoSubject
            .pipe(
                untilDestroyed(this),
                map(system => {
                    if (system) {
                        this.selectedSystem = { value: system.id, name: this.makeSystemName(system), disabled: false, icon: this.CONFIG.icons.dirTextButtons + 'storage_cloud.svg' };
                        return system;
                    }
                    if (!system || !system.serverManager.servers || system.serverManager.servers.length === 0) {
                        throw system;
                    }
                }),
                retryWhen(err => {
                    return err.pipe(delay(1000), take(7));
                }),
                finalize(() => {
                    if (!this.serversLoaded$.value) {
                        this.tryNextSystem();
                    }
                })
            )
            .subscribe(_system => {
                if (!this.mediaServerUpdating) {
                    if (this.mediaServerErrorCount >= this.mediaServerErrorCountLimit) {
                        this.mediaServerErrorCount = 0;
                        this.tryNextSystem();
                    }
                    this.updateMediaServers();
                }
            });
    }

    navigateToNodeBasedOnURLPath = () => {
        const url = decodeURIComponent(decodeURIComponent(this.router.url.split('?')[0]));
        const urlIsEqual = (node: MenuNode) => {
            return node.url === url;
        };
        const activeNode = NxUtilsService.findMenuNode(this.menuNodes, urlIsEqual);
        if (activeNode) {
            this.activeNode = activeNode;
            this.menuNodes = this.menuSubject.value.nodes; // trigger change detection;
        }
    }

    private updateMediaServers() {
        this.mediaServerUpdating = true;
        let validServerFound = false;
        let APIInfoCreated = false;
        if (this.system.currentServerNotBusy) {
            if (this.system?.serverManager.servers?.length) {
                this.system.serverManager
                    .initSystemMediaServers()
                    .then(() => {
                        this.serversDropdown = [];
                        this.system.serverManager.servers.forEach((server) => {
                            if (server.status !== 'Offline') {
                                if (!validServerFound) {
                                    this.getAPIDoc(server.id, 'main')
                                        .then((response: APIDoc) => {
                                            let APIDoc = response;
                                            if (!this.isRestAPI(server.id)) {
                                                APIDoc = removeProprietaryEndpoints(APIDoc);
                                            }
                                            APIDoc = prepareSwaggerAPIDoc(APIDoc);
                                            this.setRequestUrl(APIDoc, server.id);
                                            if (!this.serversDropdown.find(dropDownServer => dropDownServer.value === server.id)) {
                                                this.serversDropdown.push({
                                                    value: server.id,
                                                    name: server.name,
                                                    apiDocFull: APIDoc,
                                                    disabled: false,
                                                    incompatible: false
                                                });
                                            }
                                            validServerFound = true;
                                        }).catch(err => {
                                            let typeOfError = 'Error';
                                            if (err.status === 404) { // this server does not support openapi
                                                typeOfError = 'Incompatible';
                                            }
                                            if (!this.serversDropdown.find(dropDownServer => dropDownServer.value === server.id)) {
                                                this.serversDropdown.push({
                                                    value: server.id,
                                                    name: server.name + ' - ' + typeOfError,
                                                    apiDocFull: {} as APIDoc,
                                                    disabled: true,
                                                    incompatible: true
                                                });
                                            }
                                        }).finally(async () => {
                                            this.selectedServer = this.serversDropdown[0];
                                            this.serversDropdown.some((server) => {
                                                if (!server.incompatible) {
                                                    this.selectedServer = server;
                                                }
                                                return !server.incompatible;
                                            });
                                            if (validServerFound && !APIInfoCreated) {
                                                APIInfoCreated = true;
                                                // Success
                                                const APIDoc = this.selectedServer.apiDocFull;
                                                const mainAPIContent = createMenuContent(APIDoc);
                                                await this.getAPIInformation(server.id, mainAPIContent, APIDoc);
                                                this.APIDropdown.push({
                                                    value: 'api_information',
                                                    name: 'Current Version',
                                                    menu: mainAPIContent,
                                                    disabled: false
                                                });
                                                this.addAPIDescription('api_information', APIDoc.info);
                                                await this.getLegacyAPIDocs(server.id, mainAPIContent, APIDoc);
                                                if (this.queryParams?.version) {
                                                    const queryVersion = this.APIDropdown.find(item => item.name.toLowerCase() === this.queryParams.version);
                                                    if (queryVersion) {
                                                        this.selectedAPI = queryVersion;
                                                    }
                                                }
                                                if (!this.selectedAPI) this.selectedAPI = this.APIDropdown[0];
                                                this.displayedAPI = APIDoc;
                                                this.setAPIInfo();
                                                this.menuNodes = this.selectedAPI.menu;
                                                this.navigateToNodeBasedOnURLPath();
                                                if (!this.activeNode) {
                                                    this.activeNode = this.menuNodes[0];
                                                }
                                                this.isReadOnly = false;
                                                this.mediaServerUpdating = false;
                                                this.serversLoaded$.next(true);
                                                if (this.serverSubscription) {
                                                    this.serverSubscription.unsubscribe();
                                                }
                                                this.mediaServerErrorCount = 0;
                                            }
                                            if (this.serversDropdown.length === this.system.serverManager.servers.length) {
                                                if (this.selectedServer.incompatible) {
                                                    // If for whatever reason, all servers are marked as incompatible
                                                    this.tryNextSystem();
                                                }
                                                this.mediaServerUpdating = false;
                                                this.serversLoaded$.next(true);
                                                if (this.serverSubscription) {
                                                    this.serverSubscription.unsubscribe();
                                                }
                                                this.mediaServerErrorCount = 0;
                                            }
                                        });
                                }
                            } else {
                                this.serversDropdown.push({
                                    value: server.id,
                                    name: server.name + ' - Offline',
                                    apiDocFull: {} as APIDoc,
                                    disabled: true,
                                    incompatible: true
                                });
                            }
                        });
                    })
                    .catch(error => {
                        this.mediaServerUpdating = false;
                        this.mediaServerErrorCount++;
                        console.error(error);
                    });
            } else {
                this.mediaServerUpdating = false;
            }
        }
    }

    async generateSystemsDropdown() {
        this.systems.forEach(system => {
            if (system.name !== undefined) {
                const onlineSystem = this.systemIsOnline(system);
                const sysName = this.makeSystemName(system);
                const displayName = onlineSystem ? sysName : sysName + ' - Offline';
                this.systemsDropdown.push({ value: system.id, name: displayName, disabled: !onlineSystem, icon: this.CONFIG.icons.dirTextButtons + 'storage_cloud.svg' });
                if (onlineSystem) {
                    this.validSystems.push(system);
                }
            }
        });

        if (!environment.isLocal && this.readonlyAPIsEnabled) {
            const readOnlyJSONs = await this.api.getOpenAPIJSONs().toPromise();
            if (this.systemsDropdown.length && readOnlyJSONs.data.length) {
                this.systemsDropdown.push({ value: 'seperator', name: 'seperator' });
            }
            for (const API of readOnlyJSONs.data) {
                try {
                    removeProprietaryEndpoints(API.content);
                    prepareSwaggerAPIDoc(API.content);
                } catch (error) { // Invalid format, don't add to dropdown
                    continue;
                }
                this.systemsDropdown.push({ value: API, name: this.makeReadonlyAPIName(API), icon: this.CONFIG.icons.dirNonStandard + 'api.svg', json: API.content });
            }
        }
    }

    makeReadOnlyAPI = () => {
        const APIDoc = this.selectedSystem.json;
        const mainAPIContent = createMenuContent(APIDoc);
        addAPIInfoNodesToMenu(APIDoc, mainAPIContent, false);
        this.APIDropdown.push({
            value: 'api_information',
            name: 'Current Version',
            menu: mainAPIContent,
            disabled: false
        });
        this.addAPIDescription('api_information', APIDoc.info);
        this.systemVersion = 5.0;
        this.serversLoaded$.next(true);
        this.menuNodes = mainAPIContent;
        this.displayedAPI = APIDoc;
        this.isReadOnly = true;
        this.selectedAPI = this.APIDropdown.slice(-1)[0];
        this.activeNode = this.menuNodes[0];
        this.navigateToNodeBasedOnURLPath();
    }

    async handleSystemChange() {
        if (environment.isLocal) {
            const systemInfo = await this.system.serverManager.getModuleInfo().toPromise();
            const version = parseFloat(systemInfo?.reply?.version);

            if (!version || version < 4) {
                this.markSystemOutdated();
            } else {
                this.systemVersion = version;
                this.getServersInfo();
            }
            return;
        }

        this.system.infoSubject.pipe(filter(system => system?.info !== undefined), take(1)).subscribe(system => {
            if (system.info && !system.info.version) {
                this.outDatedSystem = true;
            } else {
                this.systemVersion = parseFloat(system.info.version);
            }

            if (this.outDatedSystem || this.systemVersion < 4) {
                // System version is too old
                this.markSystemOutdated();
                return;
            }

            this.getServersInfo();
        });
    }

    markSystemOutdated = () => {
        this.serversLoaded$.next(true);
        this.outDatedSystem = true;
        this.menuNodes = [];
        this.selectedSystem = this.systemsDropdown.find(system => system.value === this.system.id);
    }

    private getAPIDoc(serverId: string, type: APIDocVersion) {
        return this.system.serverManager
            .getApiDoc(serverId, type);
    }

    private setRequestUrl(api: APIDoc, serverID) {
        // servers.url currently only has a single item which determines the route that API requests go to.
        api.servers[0].url = this.system.serverManager.mediaserverConnections[serverID].urlBase;
    }

    async getLegacyAPIDocs(serverID, mainMenuContent: MenuNodeWithParent[], apiDocFull: APIDoc) {
        let legacyAPI;
        let deprecatedAPI;

        // Optional chaining here because getApiDoc returns undefined if system version is below 5.0
        const legacyAPICall = this.getAPIDoc(serverID, 'legacy')?.then(response => {
            removeProprietaryEndpoints(response);
            modifyTagNames(response, 'legacy');
            legacyAPI = modifyPathTags(response, 'legacy');
        });
        const deprecatedAPICall = this.getAPIDoc(serverID, 'deprecated')?.then(response => {
            removeProprietaryEndpoints(response);
            modifyTagNames(response, 'deprecated');
            deprecatedAPI = modifyPathTags(response, 'deprecated');
        });

        await legacyAPICall;
        await deprecatedAPICall;

        if (legacyAPI) {
            apiDocFull.tags = [...apiDocFull.tags, ...legacyAPI.tags];
            apiDocFull.paths = Object.assign(apiDocFull.paths, legacyAPI.paths);
            const APIType: APIDocVersion = 'legacy';
            addSeperatedAPI(legacyAPI, mainMenuContent, 'LEGACY');
            this.addAPIDescription(APIType, legacyAPI.info);
        }
        if (deprecatedAPI) {
            const APIType: APIDocVersion = 'deprecated';
            apiDocFull.tags = [...apiDocFull.tags, ...deprecatedAPI.tags];
            apiDocFull.paths = Object.assign(apiDocFull.paths, deprecatedAPI.paths);
            const deprecatedMenuContent = createMenuContent(deprecatedAPI);
            addAPIInfoNodesToMenu(apiDocFull, deprecatedMenuContent, false);
            this.APIDropdown.push({
                value: 'deprecated',
                name: 'Deprecated',
                menu: deprecatedMenuContent,
                disabled: false
            });
            this.addAPIDescription(APIType, deprecatedAPI.info);
        }
    }

    async getAPIInformation(serverID: string, mainMenuContent: MenuNodeWithParent[], APIDoc: APIDoc) {
        let restAPIInfo = true;
        if (this.isRestAPI(serverID)) {
            const changeLog = this.system.serverManager.getApiChangelog(serverID).then((api: any) => {
                this.markdownStore.api_changelog = api;
            }).catch(() => {
                restAPIInfo = false;
            });

            const APIPreamble = this.system.serverManager.getApiPreamble(serverID).then((api: any) => {
                this.markdownStore.api_information = api;
            }).catch(() => {
                restAPIInfo = false;
            });

            await changeLog;
            await APIPreamble;
        } else {
            restAPIInfo = false;
        }

        addAPIInfoNodesToMenu(APIDoc, mainMenuContent, restAPIInfo);
    }
}
