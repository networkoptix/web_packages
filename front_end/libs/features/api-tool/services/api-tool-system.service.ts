import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep, isEqual } from 'lodash-es';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom, of, Subject, Subscription } from 'rxjs';
import {
    catchError,
    delay,
    distinctUntilChanged,
    filter,
    finalize,
    retryWhen,
    take,
    tap,
    timeout,
} from 'rxjs/operators';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import type {
    APIDocType,
    LegacyMenuManifest,
    MarkdownItem,
    MenuManifest,
} from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import type { NxSystemServer } from '@services/system.service/types/servers.types';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { NxUriService } from '@services/uri.service';
import { apiTool } from '@static-variables';
import { useBrandingVariables } from '@utils/nx';

import type { APIDoc } from '../api-tool-types';

import type {
    EmitInfo,
    IndexDBCacheObject,
    MarkdownIndex,
    ServerInfo,
} from './api-tool-service-types';
import { NxReadonlyAPIService } from './readonly-api.service';

@UntilDestroy()
@Injectable()
export class NxAPIToolSystemService {
    CONFIG: IConfig;
    _currentSystem: NxSystem;
    currentSystemId$ = new BehaviorSubject<string>(null);
    systemVersion$ = new BehaviorSubject<string>(null);
    systemEmitter$ = new Subject<EmitInfo<NxSystemInfo | NxSystem>>();
    validSystems: NxSystemInfo[] = []; // Used for trying all possible systems before showing an error
    systems: NxSystemInfo[] = [];
    manualSystemChange = false;
    systemChangeLockout = false;

    getServers = {
        updating: false,
        errorCount: 0,
        errorCountLimit: 2,
    };

    currentServerId$ = new BehaviorSubject<string>(null);
    serverEmitter$ = new Subject<EmitInfo<ServerInfo>>();
    serversLoading$ = new BehaviorSubject(true);
    private serverSubscription: Subscription;

    emitSystem(system: NxSystemInfo | NxSystem, disabled = false, error = ''): void {
        this.systemEmitter$.next({ info: system, disabled, error });
    }

    emitServer(
        server: NxSystemServer,
        json: APIDoc,
        disabled = false,
        error = '',
        markdown: MarkdownIndex | undefined = undefined,
    ): void {
        this.serverEmitter$.next({ info: { server, json, markdown }, disabled, error });
    }

    queryParams: Params;
    preventNextChangeDetection = false;

    loading$ = new BehaviorSubject(true);
    loadingFailure$ = new BehaviorSubject(false); // Errors that redirect to a placeholder page.
    loadingErrorType: '' | 'NO_SYSTEM_FOUND_API_TOOL' | 'SYSTEM_FAILED_TO_LOAD_API_TOOL' = '';
    outDatedSystem$ = new BehaviorSubject(false);

    get currentSystemId() {
        return this.currentSystemId$.value;
    }
    set currentSystemId(systemId: string) {
        this.currentSystemId$.next(systemId);
    }

    get currentServerId() {
        return this.currentServerId$.value;
    }
    set currentServerId(value) {
        this.currentServerId$.next(value);
    }

    get currentSystem() {
        return this._currentSystem;
    }
    set currentSystem(system: NxSystem) {
        this._currentSystem = system;
        if (system && this.currentSystemId !== system.id) {
            this.currentSystemId = system.id;
        }
    }

    get systemVersion() {
        return this.systemVersion$.value;
    }
    set systemVersion(version: string) {
        this.systemVersion$.next(version);
    }

    constructor(
        private configService: NxConfigService,
        private systemService: NxSystemService,
        private readonlyAPIService: NxReadonlyAPIService,
        private accountService: NxAccountService,
        private headerService: NxHeaderService,
        private _route: ActivatedRoute,
        private router: Router,
        private uri: NxUriService,
        private indexedDbService: NgxIndexedDBService,
        private systemsService: NxSystemsService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.initializeAPITool();

        this._route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            this.queryParams = params;
        });

        this.currentSystemId$
            .pipe(
                untilDestroyed(this),
                filter(system => !!system),
            )
            .subscribe(system => {
                this.currentServerId = '';
                this.setQueryParams('system', system);
                this.getServers.errorCount = 0;
                this.serversLoading$.next(true);
                this.outDatedSystem$.next(false);
                this.loading$.next(true);
                this.handleSystemChange();
                this.disableManualSystemChanging();
            });

        this.readonlyAPIService.currentReadonlyAPI$
            .pipe(
                untilDestroyed(this),
                filter(api => !!api),
            )
            .subscribe(({ api }) => {
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

    async initSystems(systems: NxSystemInfo[]): Promise<void> {
        this.emitAllSystems(systems);
        if (!environment.isWebadmin) {
            await this.readonlyAPIService.getReadonlyAPIs();
            if (await this.readonlyAPIService.getReadonlyAPIByQueryParams()) {
                return;
            }
        }

        if (environment.isWebadmin) {
            this.getLocalSystem();
            return;
        }

        const cachedSystem = this.systemService.getCurrentSystem();
        if (cachedSystem && cachedSystem.isOnline) {
            this.currentSystem = cachedSystem;
            return;
        }

        const systemByQueryParam = systems.find(
            system => this.systemIsOnline(system) && system.id === this.queryParams.system,
        );

        const onlineSystem = systemByQueryParam || this.findOnlineSystem(systems);
        if (onlineSystem) {
            this.currentSystem = await this.systemService.createSystem('', onlineSystem.id);
            return;
        }
        if (!environment.isWebadmin && (await this.readonlyAPIService.setReadonlyAPI())) {
            // Get any readonlyAPI
            return;
        }
        this.showError();
    }

    async handleSystemChange(): Promise<void> {
        if (environment.isWebadmin) {
            const systemInfo = await firstValueFrom(
                this.currentSystem.serverManager.getModuleInfo(),
            );
            const version = systemInfo?.reply?.version;
            if (!version || parseFloat(version) < 4) {
                this.markSystemOutdated();
            } else {
                this.systemVersion = version;
                this.getServersInfo();
            }
            return;
        }
        if (this.currentSystemId && this.currentSystemId !== this.currentSystem?.id) {
            this.currentSystem = await this.systemService.createSystem('', this.currentSystemId);
        }
        const systemInfo = await this.currentSystem.getInfo();
        if (!systemInfo.info.version) {
            this.outDatedSystem$.next(true);
        } else {
            this.systemVersion = systemInfo.info.version;
        }
        if (this.outDatedSystem$.value || parseFloat(this.systemVersion) < 4) {
            // System version is too old
            this.markSystemOutdated();
            return;
        }
        this.getServersInfo();
    }

    getMenuManifest(): Promise<MenuManifest | LegacyMenuManifest | undefined> {
        return this.currentSystem.serverManager.getApiToolManifest();
    }

    getServersInfo(): void {
        this.serversLoading$.next(true);
        this.serverSubscription?.unsubscribe();
        this.serverSubscription = this.currentSystem.infoSubject
            .pipe(
                untilDestroyed(this),
                filter(system => !!system),
                retryWhen(err => {
                    return err.pipe(delay(1000), take(3));
                }),
                finalize(() => {
                    if (this.serversLoading$.value && !this.manualSystemChange) {
                        this.tryNextSystem();
                    }
                    this.manualSystemChange = false;
                }),
            )
            .subscribe(_system => {
                if (!this.getServers.updating) {
                    if (this.getServers.errorCount >= this.getServers.errorCountLimit) {
                        this.getServers.errorCount = 0;
                        this.tryNextSystem();
                        return;
                    }
                    this.getServersAndJSONs();
                }
            });
    }

    private async getServersAndJSONs(): Promise<void> {
        let validServerFound = false;
        this.getServers.updating = true;
        await this.getMenuManifest();
        const cachedFiles = await this.getJSONFromCache(
            'main',
            this.currentSystemId,
            this.systemVersion,
        );
        this.currentSystem.serverManager
            .getServers()
            .pipe(
                timeout(2500),
                take(1),
                catchError(err => {
                    console.error(err);
                    return of([] as NxSystemServer[]);
                }),
                tap(servers => {
                    if (!servers?.length) {
                        this.handleServerGetError();
                    }
                }),
                untilDestroyed(this),
            )
            .subscribe(servers => {
                servers.forEach(server => {
                    if (!validServerFound) {
                        // Loop skips all other servers after a single valid server is found
                        if (server.status !== 'Offline') {
                            if (cachedFiles) {
                                const { json, markdown } = cachedFiles;
                                this.setRequestURL(json);
                                this.currentServerId = server.id;
                                if (markdown) {
                                    this.emitServer(server, json, false, '', markdown);
                                } else {
                                    this.emitServer(server, json);
                                }
                                validServerFound = true;
                                this.serversFinishedLoading();
                            } else {
                                this.getAPIDoc('main') // TODO: remove, JSONs being grabbed by manifest
                                    .then(async (response: APIDoc) => {
                                        await this.handleSuccessfulAPIDocGet(server, response);
                                        validServerFound = true;
                                    })
                                    .catch(err => {
                                        const typeOfError =
                                            err.status === 404 ? 'Incompatible' : 'Error';
                                        this.emitServer(server, {} as APIDoc, true, typeOfError);
                                    })
                                    .finally(() => {
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
            });
    }

    handleServerGetError(): void {
        this.getServers.errorCount++;
        this.getServers.updating = false;
        if (this.getServers.errorCount >= this.getServers.errorCountLimit) {
            this.serverSubscription.unsubscribe();
        }
    }

    async handleSuccessfulAPIDocGet(server: NxSystemServer, json: APIDoc): Promise<void> {
        this.setRequestURL(json);
        this.currentServerId = this.currentServerId || server.id;
        this.emitServer(server, json, false, '');
    }

    async getLocalSystem(): Promise<void> {
        this.accountService.get().then(async account => {
            if (!account) {
                this.router.navigate(['/']);
            }
            const localSystem = this.systemService.createLocalSystem(
                this.accountService.mediaServerApi,
                account.id,
                account.email,
            );
            await localSystem.update().catch(() => {});
            this.currentSystem = localSystem;
        });
    }

    findOnlineSystem = (systems: NxSystemInfo[]) => {
        const onlineSystem =
            this.headerService.lastActive && this.systemIsOnline(this.headerService.lastActive)
                ? this.headerService.lastActive
                : systems.find(system => this.systemIsOnline(system));

        return onlineSystem;
    };

    async tryNextSystem(): Promise<void> {
        this.getServers.errorCount = 0;
        if (environment.isWebadmin) {
            this.showError();
        } else {
            this.emitSystem(this.currentSystem, true, 'Error');
            this.validSystems = this.validSystems.filter(
                system => system.id !== this.currentSystem.id,
            );
            if (this.validSystems.length) {
                this.currentSystem = await this.systemService.createSystem(
                    '',
                    this.validSystems[0].id,
                );
                return;
            }
            if (this.readonlyAPIService.isEnabled) {
                if (await this.readonlyAPIService.setReadonlyAPI()) {
                    return;
                }
            }
            // No more valid systems left
            this.showError();
        }
    }

    emitAllSystems(systems: NxSystemInfo[]): void {
        systems.forEach(system => {
            const isDisabled = !this.systemIsOnline(system);
            const error = isDisabled ? 'Offline' : '';
            this.emitSystem(system, isDisabled, error);
            if (!isDisabled) {
                this.validSystems.push(system);
            }
            this.systems.push(system);
        });
    }

    markSystemOutdated = (): void => {
        this.loading$.next(false);
        this.serversLoading$.next(false);
        this.outDatedSystem$.next(true);
    };

    showError = (): void => {
        this.loadingFailure$.next(true);
        this.loadingErrorType = environment.isWebadmin
            ? 'SYSTEM_FAILED_TO_LOAD_API_TOOL'
            : 'NO_SYSTEM_FOUND_API_TOOL';
        this.serverSubscription?.unsubscribe();
    };

    setQueryParams = (param: string, newValue: string | number) => {
        if (environment.isWebadmin && param === 'system') {
            return;
        }

        const queryParams = cloneDeep(this.queryParams);
        queryParams[param] = newValue;
        this.queryParams = queryParams;
        this.uri.updateURI(this.uri.getURL(), queryParams);
    };

    initializeAPITool = (): void => {
        const initialSystems = this.systemsService.systems || [];
        let systemsSubjectSubscription: Subscription;
        if (!initialSystems.length) {
            systemsSubjectSubscription = this.systemsService.systemsSubject
                .pipe(
                    distinctUntilChanged((a, b) => isEqual(a, b)),
                    untilDestroyed(this),
                )
                .subscribe(systems => {
                    this.initSystems(systems);
                });
        } else {
            this.initSystems(initialSystems);
        }

        this.accountService.get().then(account => {
            if (!account) {
                // Anonymous user init, try to get readonly APIs
                this.initSystems([]);
                systemsSubjectSubscription?.unsubscribe();
            }
        });
    };

    // Helpers
    isRestAPI(serverID = this.currentServerId) {
        // REST API servers are 5.0 and above
        return this.currentSystem.serverManager.mediaserver instanceof NxSystemRestAPI;
    }

    setRequestURL(api: APIDoc): void {
        // servers.url currently only has a single item which determines the route that API requests go to.
        api.servers[0].url = this.currentSystem?.serverManager?.mediaserver.urlBase;
    }

    private serversFinishedLoading(): void {
        this.getServers.updating = false;
        this.serversLoading$.next(false); // triggers a check to make sure a valid server exists
        this.serverSubscription?.unsubscribe();
        this.getServers.errorCount = 0;
    }

    systemIsOnline = (system: NxSystem | NxSystemInfo) =>
        this.systemsService.systems.find(({ id }) => id === system.id)?.stateOfHealth === 'online';

    private getAPIDoc(type: APIDocType) {
        return this.currentSystem.serverManager.getApiDoc(type);
    }

    fetchJSON(route: string) {
        return this.currentSystem.serverManager.fetchApiToolJSON(route);
    }

    /**
     * Fetches all markdown files simultaneously
     * Any requests that fail do not get returned in the index
     */
    async getMarkdownFiles(markdownStructure: MarkdownItem[]): Promise<MarkdownIndex> {
        const promiseArray: Promise<MarkdownIndex>[] = [];
        for (const markdownItem of markdownStructure) {
            promiseArray.push(this.getMarkdownFileWithName(markdownItem.name, markdownItem.doc));
            if (markdownItem.chapters) {
                for (const chapter of markdownItem.chapters) {
                    promiseArray.push(this.getMarkdownFileWithName(chapter.name, chapter.doc));
                }
            }
        }
        const markdownObject: MarkdownIndex = {};
        await Promise.allSettled(promiseArray).then(results => {
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const { name, markdown } = result.value;
                    markdownObject[name] = markdown;
                }
            });
        });
        return markdownObject;
    }

    async getMarkdownFileWithName(name: string, file: string): Promise<MarkdownIndex> {
        try {
            const markdown = await this.currentSystem.serverManager.getApiMarkdownFile(file);
            return { name: name.replace(/\s+/g, ''), markdown: markdown || '' };
        } catch (error) {
            return { name: name.replace(/\s+/g, ''), markdown: '' };
        }
    }

    async getLegacyAPIInfoMarkdown(serverID: string) {
        let APIInformation;
        let APIChangelog;
        if (this.isRestAPI(serverID)) {
            const changeLog = this.currentSystem.serverManager
                .getApiMarkdownFile('api_changelog')
                ?.then((api: any) => {
                    APIChangelog = api;
                })
                .catch(() => {});

            const preamble = this.currentSystem.serverManager
                .getApiMarkdownFile('api_preamble')
                ?.then((api: any) => {
                    APIInformation = api;
                })
                .catch(() => {});

            await changeLog;
            await preamble;
        }

        return { APIInformation, APIChangelog };
    }

    useBrandingVariables = useBrandingVariables;

    // Caching
    private makeCacheKey = (systemId: string, scheme: string) => {
        return systemId + '-api-tool-file-' + scheme;
    };

    async getJSONFromCache(
        route: string,
        systemId: string,
        systemVersion: string,
    ): Promise<IndexDBCacheObject | null> {
        if (this.queryParams.disableCache) {
            return null;
        }
        const cachedObject = (await firstValueFrom(
            this.indexedDbService
                .getByKey('jsons', this.makeCacheKey(systemId, route))
                .pipe(take(1)),
        )) as IndexDBCacheObject;
        if (!cachedObject) {
            // Not cached
            return null;
        }

        const { version, key } = cachedObject;
        if (systemVersion !== version) {
            // System version has changed, invalidate cache
            this.indexedDbService
                .deleteByKey('jsons', key)
                .pipe(take(1))
                .subscribe(() => {});
            return null;
        }
        return cachedObject;
    }

    async cacheJSON(
        route: string,
        systemId: string,
        systemVersion: string,
        json: APIDoc,
        markdown: MarkdownIndex | undefined = undefined,
    ): Promise<void> {
        if (this.queryParams.disableCache) {
            this.indexedDbService
                .deleteByKey('jsons', this.makeCacheKey(systemId, route))
                .pipe(take(1))
                .subscribe(() => {});
            return;
        }
        const cachedObject = await this.getJSONFromCache(route, systemId, systemVersion);
        if (!cachedObject) {
            this.indexedDbService
                .add('jsons', {
                    json,
                    version: systemVersion,
                    markdown,
                    key: this.makeCacheKey(systemId, route),
                })
                .pipe(take(1))
                .subscribe(() => {});
        }
    }

    private disableManualSystemChanging = (): void => {
        this.systemChangeLockout = true;
        setTimeout(() => {
            this.systemChangeLockout = false;
        }, apiTool.manualSystemChangeCooldown);
    };
}
