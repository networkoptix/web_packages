import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual, cloneDeep } from 'lodash-es';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { delay, distinctUntilChanged, filter, finalize, map, retryWhen, take } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import type { APIDocType } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUriService } from '@services/uri.service';

import type { APIDoc } from '../api-tool-types';

import type { EmitInfo, ServerInfo } from './api-tool-service-types';
import { NxReadonlyAPIService } from './readonly-api.service';

@UntilDestroy()
@Injectable()
export class NxAPIToolSystemService {
    CONFIG: IConfig;
    _currentSystem: NxSystem;
    currentSystemId$ = new BehaviorSubject<string>(null);
    systemVersion$ = new BehaviorSubject<string>(null);
    systemEmitter$ = new Subject<EmitInfo<NxSystem>>();
    validSystems: NxSystemWithUserInfo[] = []; // Used for trying all possible systems before showing an error
    manualSystemChange = false;
    systemChangeLockout = false;

    mediaServer = {
        updating: false,
        errorCount: 0,
        errorCountLimit: 4
    };

    currentServerId$ = new BehaviorSubject<string>(null);
    serverEmitter$ = new Subject<EmitInfo<ServerInfo>>();
    serversLoading$ = new BehaviorSubject(true);
    private serverSubscription: Subscription;

    emitSystem(system: NxSystem, disabled = false, error = '') {
        this.systemEmitter$.next({ info: system, disabled, error });
    }

    emitServer(server: NxSystemServer, json: APIDoc, disabled = false, error = '') {
        this.serverEmitter$.next({ info: { server, json }, disabled, error });
    }

    queryParams: Params;
    preventNextChangeDetection = false;

    loading$ = new BehaviorSubject(true);
    loadingFailure$ = new BehaviorSubject(false); // Errors that redirect to a placeholder page.
    loadingErrorType: '' | 'NO_SYSTEM_FOUND_API_TOOL' | 'SYSTEM_FAILED_TO_LOAD_API_TOOL' = '';
    outDatedSystem$ = new BehaviorSubject(false);

    get currentSystemId() { return this.currentSystemId$.value; }
    set currentSystemId(systemId: string) { this.currentSystemId$.next(systemId); }

    get currentServerId() { return this.currentServerId$.value; }
    set currentServerId(value) { this.currentServerId$.next(value); }

    get currentSystem() { return this._currentSystem; }
    set currentSystem(system: NxSystem) {
        this._currentSystem = system;
        if (this.currentSystemId !== system.id) {
            this.currentSystemId = system.id;
        }
    }

    get systemVersion() { return this.systemVersion$.value; }
    set systemVersion(version: string) { this.systemVersion$.next(version); }

    constructor(
        private configService: NxConfigService,
        private systemService: NxSystemService,
        private readonlyAPIService: NxReadonlyAPIService,
        private accountService: NxAccountService,
        private headerService: NxHeaderService,
        private _route: ActivatedRoute,
        private router: Router,
        private uri: NxUriService,
        private localStorage: LocalStorageService,
        private systemsService: NxSystemsService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.initializeAPITool();

        this._route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            this.queryParams = params;
        });

        this.currentSystemId$.pipe(untilDestroyed(this), filter(system => !!system)).subscribe(system => {
            this.currentServerId = null;
            this.setQueryParams('system', system);
            this.serversLoading$.next(true);
            this.outDatedSystem$.next(false);
            this.loading$.next(true);
            this.handleSystemChange();
            this.disableManualSystemChanging();
        });

        this.readonlyAPIService.currentReadonlyAPI$.pipe(untilDestroyed(this), filter(api => !!api)).subscribe(({ api }) => {
            this.systemVersion = api.version;
            this.setQueryParams('system', api.id.toString());
            this.loading$.next(false);
        });

        this.serversLoading$.pipe(untilDestroyed(this)).subscribe(loaded => {
            if (!loaded) {
                if (!this.loading$.value) {
                    return;
                }
                if (this.currentServerId) {
                    this.loading$.next(false);
                    this.systemChangeLockout = false;
                } else {
                    this.tryNextSystem();
                }
            }
        });
    }

    async initSystems(systems: NxSystemWithUserInfo[]) {
        this.emitAllSystems(systems);
        if (!environment.isLocal) {
            await this.readonlyAPIService.getReadonlyAPIs();
            if (this.readonlyAPIService.getReadonlyAPIByQueryParams()) {
                return;
            };
        }

        if (environment.isLocal) {
            this.getLocalSystem();
            return;
        }

        const cachedSystem = this.systemService.getCurrentSystem();
        if (cachedSystem) {
            this.currentSystem = cachedSystem;
            return;
        }

        const systemByQueryParam = systems.find(system => this.systemIsOnline(system) && system.id === this.queryParams.system);

        const onlineSystem = systemByQueryParam || this.findOnlineSystem(systems);
        if (onlineSystem) {
            this.currentSystem = await this.systemService.createSystem('', onlineSystem.id);
            return;
        }

        if (!environment.isLocal && this.readonlyAPIService.setReadonlyAPI()) { // Get any readonlyAPI
            return;
        }

        this.showError();
    }

    async handleSystemChange() {
        if (environment.isLocal) {
            const systemInfo = await this.currentSystem.serverManager.getModuleInfo().toPromise();
            const version = systemInfo?.reply?.version;
            if (!version || parseFloat(version) < 4) {
                this.markSystemOutdated();
            } else {
                this.systemVersion = version;
                this.getServersInfo();
            }
            return;
        }
        if (this.currentSystemId !== this.currentSystem?.id) {
            this.currentSystem =  await this.systemService.createSystem('', this.currentSystemId);
        }
        this.currentSystem.infoSubject.pipe(filter(system => system?.info !== undefined), take(1)).subscribe(system => {
            if (system.info && !system.info.version) {
                this.outDatedSystem$.next(true);
            } else {
                this.systemVersion = system.info.version;
            }
            if (this.outDatedSystem$.value || parseFloat(this.systemVersion) < 4) {
                // System version is too old
                this.markSystemOutdated();
                return;
            }

            this.getServersInfo();
        });
    }

    getServersInfo() {
        this.serversLoading$.next(true);
        this.serverSubscription?.unsubscribe();
        this.serverSubscription = this.currentSystem.infoSubject
            .pipe(
                untilDestroyed(this),
                map(system => {
                    if (system) {
                        return system;
                    }
                    if (!system || !system.serverManager.servers || system.serverManager.servers.length === 0) {
                        throw new Error();
                    }
                }),
                retryWhen(err => {
                    return err.pipe(delay(1000), take(7));
                }),
                finalize(() => {
                    if (this.serversLoading$.value && !this.manualSystemChange) {
                        this.tryNextSystem();
                    }
                    this.manualSystemChange = false;
                })
            )
            .subscribe(_system => {
                if (!this.mediaServer.updating) {
                    if (this.mediaServer.errorCount >= this.mediaServer.errorCountLimit) {
                        this.mediaServer.errorCount = 0;
                        this.tryNextSystem();
                    }
                    this.getServersAndJSONs();
                }
            });
    }

    private getServersAndJSONs() {
        let validServerFound = false;
        this.mediaServer.updating = true;
        const cachedJSON = this.retrieveJSONFromLocalStorage('main');
        if (this.currentSystem.currentServerNotBusy) {
            if (this.currentSystem?.serverManager.servers?.length) {
                this.currentSystem.serverManager
                    .initSystemMediaServers()
                    .then(() => {
                        this.currentSystem.serverManager.servers.forEach(server => {
                            if (!validServerFound) { // Loop skips all other servers after a single valid server is found
                                if (server.status !== 'Offline') {
                                    if (cachedJSON) {
                                        this.setRequestURL(cachedJSON, server.id);
                                        this.currentServerId = server.id;
                                        this.emitServer(server, cachedJSON);
                                        validServerFound = true;
                                        this.serversFinishedLoading();
                                    } else {
                                        this.getAPIDoc(server.id, 'main')
                                            .then((response: APIDoc) => {
                                                const json = response;
                                                this.storeJSONInLocalStorage(json, 'main');
                                                this.setRequestURL(json, server.id);
                                                this.currentServerId = this.currentServerId || server.id;
                                                this.emitServer(server, json);
                                                validServerFound = true;
                                            }).catch(err => {
                                                const typeOfError = err.status === 404 ? 'Incompatible' : 'Error';
                                                this.emitServer(server, {} as APIDoc, true, typeOfError);
                                            }).finally(() => {
                                                // For reference, if server dropdown ever needs to be displayed and we have to get all servers:
                                                // const isLastServer = this.currentSystem.serverManager.servers.slice(-1)[0]?.id === server.id;
                                                if (validServerFound) {
                                                    this.serversFinishedLoading();
                                                }
                                            });
                                    }
                                } else {
                                    this.emitServer(server, {} as APIDoc, true, 'Offline');
                                }
                            }
                        });
                    })
                    .catch(error => {
                        this.mediaServer.updating = false;
                        this.mediaServer.errorCount++;
                        console.error(error);
                    });
            } else {
                this.mediaServer.updating = false;
            }
        }
    }

    getLocalSystem() {
        this.accountService.get().then(account => {
            if (!account) {
                this.router.navigate(['/']);
            }
            this.currentSystem = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
        });
    }

    findOnlineSystem = (systems: NxSystemWithUserInfo[]) => {
        const onlineSystem = this.headerService.lastActive && this.systemIsOnline(this.headerService.lastActive)
            ? this.headerService.lastActive : systems.find(system => this.systemIsOnline(system));

        return onlineSystem;
    };

    async tryNextSystem() {
        if (environment.isLocal) {
            this.showError();
        } else {
            this.emitSystem(this.currentSystem, true, 'Error');
            this.validSystems = this.validSystems.filter(system => system.id !== this.currentSystem.id);
            if (this.validSystems.length) {
                this.currentSystem = await this.systemService.createSystem('', this.validSystems[0].id);
                this.getServersInfo();
                return;
            }
            // No more valid systems left
            this.showError();
        }
    }

    async getLegacyAPIDocs(serverID: string) {
        let legacyAPI: APIDoc;
        let deprecatedAPI: APIDoc;

        legacyAPI = this.retrieveJSONFromLocalStorage('legacy');
        deprecatedAPI = this.retrieveJSONFromLocalStorage('deprecated');

        // Optional chaining here because getApiDoc returns undefined if system version is below 5.0
        const legacyAPICall = legacyAPI || this.getAPIDoc(serverID, 'legacy')?.then(response => {
            this.storeJSONInLocalStorage(response, 'legacy');
            legacyAPI = response;
        });
        const deprecatedAPICall = deprecatedAPI || this.getAPIDoc(serverID, 'deprecated')?.then(response => {
            this.storeJSONInLocalStorage(response, 'deprecated');
            deprecatedAPI = response;
        });
        await legacyAPICall;
        await deprecatedAPICall;

        return [legacyAPI, deprecatedAPI];
    }

    emitAllSystems(systems: NxSystemWithUserInfo[]) {
        systems.forEach(system => {
            const isDisabled = !this.systemIsOnline(system);
            const error = isDisabled ? 'Offline' : '';
            this.emitSystem(system, isDisabled, error);
            if (!isDisabled) {
                this.validSystems.push(system);
            }
        });
    }

    markSystemOutdated = () => {
        this.loading$.next(false);
        this.serversLoading$.next(false);
        this.outDatedSystem$.next(true);
    };

    showError = () => {
        this.loadingFailure$.next(true);
        this.loadingErrorType = environment.isLocal ? 'SYSTEM_FAILED_TO_LOAD_API_TOOL' : 'NO_SYSTEM_FOUND_API_TOOL';
        this.serverSubscription?.unsubscribe();
    };

    setQueryParams = (param: string, newValue: string) => {
        if (environment.isLocal && param === 'system') return;

        const queryParams = cloneDeep(this.queryParams);
        queryParams[param] = newValue;
        this.queryParams = queryParams;
        this.uri.updateURI(this.uri.getURL(), queryParams);
    };

    initializeAPITool = () => {
        const initialSystems = this.systemsService.systems || [];
        let systemsSubjectSubscription: Subscription;
        if (!initialSystems.length) {
            systemsSubjectSubscription = this.systemsService.systemsSubject
                .pipe(
                    distinctUntilChanged((a, b) => isEqual(a, b)),
                    untilDestroyed(this))
                .subscribe(systems => {
                    this.initSystems(systems);
                });
        } else {
            this.initSystems(initialSystems);
        }

        this.accountService.get().then(account => {
            if (!account) { // Anonymous user init, try to get readonly APIs
                this.initSystems([]);
                systemsSubjectSubscription?.unsubscribe();
            }
        });
    };

    // Helpers
    isRestAPI(serverID = this.currentServerId) {
        // REST API servers are 5.0 and above
        return this.currentSystem.serverManager.mediaserverConnections[serverID] instanceof NxSystemRestAPI;
    }

    private setRequestURL(api: APIDoc, serverID) {
        // servers.url currently only has a single item which determines the route that API requests go to.
        api.servers[0].url = this.currentSystem.serverManager.mediaserverConnections[serverID].urlBase;
    }

    private serversFinishedLoading() {
        this.mediaServer.updating = false;
        this.serversLoading$.next(false); // triggers a check to make sure a valid server exists
        this.serverSubscription?.unsubscribe();
        this.mediaServer.errorCount = 0;
    }

    systemIsOnline = (system: NxSystemWithUserInfo) => system.stateOfHealth === 'online';

    private getAPIDoc(serverId: string, type: APIDocType) {
        return this.currentSystem.serverManager
            .getApiDoc(serverId, type);
    }

    private makeLSKey = (systemId: string, type: APIDocType) => {
        return systemId + ' api-tool JSON ' + type;
    };

    private retrieveJSONFromLocalStorage = (type: APIDocType): APIDoc => {
        if (this.queryParams.disableCache) return null;

        const version = this.systemVersion;
        const cachedItem = this.localStorage.retrieve(this.makeLSKey(this.currentSystemId, type));
        if (version !== cachedItem?.version) return null; // invalidate cache if system version changes
        return cachedItem?.json;
    };

    private storeJSONInLocalStorage = (json: APIDoc, type: APIDocType) => {
        if (this.queryParams.disableCache) return null;

        const version = this.systemVersion;
        const cacheObject = { version, json };
        this.localStorage.store(this.makeLSKey(this.currentSystemId, type), cacheObject);
    };

    private disableManualSystemChanging = () => {
        this.systemChangeLockout = true;
        setTimeout(() => {
            this.systemChangeLockout = false;
        }, (this.CONFIG.apiTool.manualSystemChangeCooldown));
    };
}
