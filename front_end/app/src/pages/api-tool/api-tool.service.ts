import { Injectable }                               from '@angular/core';
import { Router }                                   from '@angular/router';
import { UntilDestroy, untilDestroyed }             from '@ngneat/until-destroy';
import { NxSystem, NxSystemService }                from '@services/system.service';
import { NxSystemWithUserInfo, NxSystemsService }   from '@services/systems.service';
import { NxSystemRestAPI }                          from '@services/system-rest-api.service';
import { IConfig, NxConfigService }                 from '@services/nx-config';
import { NxUtilsService }                           from '@services/utils.service';
import { NxAccountService }                         from '@services/account.service';
import { NxHeaderService }                          from '@services/nx-header.service';
import { APIDocVersion }                            from '@services/nx-config/base-config';
import { NxMenuService }                            from '@src/menu';
import { BehaviorSubject, Subscription }            from 'rxjs';
import {
    delay, distinctUntilChanged,
    finalize, map, retryWhen, take
}                                                   from 'rxjs/operators';
import {
    addSubMenuApi, createMenuContent,
    modifyPathTags, modifyTagNames,
    prepareSwaggerAPIDoc,
    removeProprietaryEndpoints
}                                                   from './api-file-utils';
import type {
    APIDoc,
    MenuContent,
    ServerDropdownItem,
    SystemDropdownItem
}                                                   from './api-tool-types';

/** Provides the currently selected system and server. Also provides the content for the left menu.   */
@UntilDestroy()
@Injectable()
export class NxAPIToolService {
    CONFIG: IConfig;

    systems: NxSystemWithUserInfo[];
    systemsDropdown: SystemDropdownItem[] = [];
    selectedSystem: SystemDropdownItem;
    system: NxSystem;

    serversDropdown: ServerDropdownItem[] = [];
    selectedServer: ServerDropdownItem;
    serversLoaded: boolean;
    private serverSubscription: Subscription;

    leftMenuContent: MenuContent;
    placeHolderContent = {
        api_information : 'API Information',
        legacy          : 'Legacy API',
        deprecated      : 'Deprecated Endpoints'
    }

    // Stores the currently selected API file's title and description
    APIDescription = { title: 'API Information', description: '' }

    loadingFailure$ = new BehaviorSubject(false);
    loadingErrorType: '' | 'NO_SYSTEM_FOUND_API_TOOL' | 'SYSTEM_FAILED_TO_LOAD_API_TOOL' = ''
    APIFileLoadingError = false;
    mediaServerUpdating = false;

    constructor(
        configService: NxConfigService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private headerService: NxHeaderService,
        private menuService: NxMenuService,
        private router: Router) {
        this.CONFIG = configService.getConfig();
        this.systems = this.systemsService.systems || [];

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

    isRestAPI(serverID = this.selectedServer.value) {
        // REST API servers are 5.0 and above
        return this.system.serverManager.mediaserverConnections[serverID] instanceof NxSystemRestAPI;
    }

    changeAPIDescription(selectedSection) {
        this.APIDescription = {
            title       : this.leftMenuContent.pageDescriptions[selectedSection].title,
            description : this.leftMenuContent.pageDescriptions[selectedSection].description
        };
    }

    async getSystem() {
        this.systems.forEach(system => {
            if (system.name !== undefined) {
                const sysName = (system.stateOfHealth !== 'online') ? system.name + ' - Offline' : system.name;
                this.systemsDropdown.push({ value: system.id, name: sysName });
            }
        });

        const cachedSystem = this.systemService.getCurrentSystem();
        if (this.CONFIG.isLocal) {
            await this.accountService.get().then((account) => {
                if (!account) {
                    this.router.navigate(['/']);
                }
                this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            });
        }  else if (cachedSystem) {
            this.system = cachedSystem;
            this.selectedSystem = { value: this.system.id, name: this.system.info.name };
        } else {
            const validSystem: NxSystemWithUserInfo = this.headerService.lastActive && this.headerService.lastActive.stateOfHealth === 'online'
                ? this.headerService.lastActive : this.systems.find(system => system.stateOfHealth === 'online');

            if (validSystem) {
                this.system = await this.systemService.createSystem('', validSystem.id);
            } else {
                this.loadingErrorType = 'NO_SYSTEM_FOUND_API_TOOL';
                this.loadingFailure$.next(true);
                return;
            }
        }

        this.getServersInfo();
    }

    getServersInfo() {
        this.serversLoaded = false;
        if (this.serverSubscription) {
            this.serverSubscription.unsubscribe();
        }
        this.serverSubscription = this.system.infoSubject
            .pipe(
                untilDestroyed(this),
                map(system => {
                    if (system) {
                        this.selectedSystem = { value: system.id, name: system.info.name };
                        return system;
                    }
                    if (!system || !system.serverManager.servers || system.serverManager.servers.length === 0) {
                        throw system;
                    }
                }),
                retryWhen(err => {
                    return err.pipe(delay(1000), take(10));
                }),
                finalize(() => {
                    if (!this.serversLoaded) {
                        this.loadingFailure$.next(true);
                        this.loadingErrorType = 'SYSTEM_FAILED_TO_LOAD_API_TOOL';
                    }
                })
            )
            .subscribe(_system => {
                if (!this.mediaServerUpdating) {
                    this.updateMediaServers();
                }
            });
    }

    private updateMediaServers() {
        this.mediaServerUpdating = true;
        if (this.system.currentServerNotBusy) {
            if (this.system?.serverManager.servers?.length) {
                this.system.serverManager
                    .initSystemMediaServers()
                    .then(() => {
                        this.serversDropdown = [];
                        this.system.serverManager.servers.forEach((server) => {
                            if (server.status !== 'Offline') {
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
                                                value        : server.id,
                                                name         : server.name,
                                                apiDocFull   : APIDoc,
                                                incompatible : false
                                            });
                                        }
                                    }).catch(err => {
                                        let typeOfError = 'Error';
                                        if (err.status === 404) { // this server does not support openapi
                                            typeOfError = 'Incompatible';
                                        }
                                        if (!this.serversDropdown.find(dropDownServer => dropDownServer.value === server.id)) {
                                            this.serversDropdown.push({
                                                value        : server.id,
                                                name         : server.name + ' - ' + typeOfError,
                                                apiDocFull   : {} as APIDoc,
                                                incompatible : true
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
                                        if (this.serversDropdown.length === this.system.serverManager.servers.length) {
                                            if (this.selectedServer.incompatible) {
                                                // If for whatever reason, all servers are marked as incompatible
                                                this.APIFileLoadingError = true;
                                                this.leftMenuContent = {} as any;
                                            } else {
                                                this.leftMenuContent = createMenuContent(this.selectedServer.apiDocFull);
                                                this.changeAPIDescription('api_information');
                                                await this.getLegacyAPIDocs(server.id, this.selectedServer.apiDocFull);
                                                this.menuService.section = 'api_information';
                                            }
                                            this.mediaServerUpdating = false;
                                            this.serversLoaded = true;
                                            if (this.serverSubscription) {
                                                this.serverSubscription.unsubscribe();
                                            }
                                        }
                                    });
                            } else {
                                this.serversDropdown.push({
                                    value        : server.id,
                                    name         : server.name + ' - Offline',
                                    apiDocFull   : {} as APIDoc,
                                    incompatible : true
                                });
                            }
                        });
                    })
                    .catch(error => {
                        this.mediaServerUpdating = false;
                        console.error(error);
                    });
            } else {
                this.mediaServerUpdating = false;
            }
        }
    }

    private getAPIDoc(serverId: string, type: APIDocVersion) {
        return this.system.serverManager
            .getApiDoc(serverId, type);
    }

    private setRequestUrl(api: APIDoc, serverID) {
        // servers.url currently only has a single item which determines the route that API requests go to.
        api.servers[0].url = this.system.serverManager.mediaserverConnections[serverID].urlBase;
    }

    async getLegacyAPIDocs(serverID, apiDocFull: APIDoc) {
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
            deprecatedAPI =  modifyPathTags(response, 'deprecated');
        });

        await legacyAPICall;
        await deprecatedAPICall;

        if (legacyAPI) {
            apiDocFull.tags = [...apiDocFull.tags, ...legacyAPI.tags];
            apiDocFull.paths = Object.assign(apiDocFull.paths,  legacyAPI.paths);
            addSubMenuApi(legacyAPI,
                this.leftMenuContent, 'legacy');
        }
        if (deprecatedAPI) {
            apiDocFull.tags = [...apiDocFull.tags, ...deprecatedAPI.tags];
            apiDocFull.paths = Object.assign(apiDocFull.paths,  deprecatedAPI.paths);
            addSubMenuApi(deprecatedAPI, this.leftMenuContent, 'deprecated');
        }
    }
}
