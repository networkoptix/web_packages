/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable nx/no-untyped-init */
/* eslint-disable nx/no-untyped-arg */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription, Observable, forkJoin, firstValueFrom } from 'rxjs';
import { auditTime, catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import stringify from 'safe-stable-stringify';
import { v4 as uuid } from 'uuid';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { MergeInfo } from '@dialogs/merge/merge.refactor.component.types';
import { environment } from '@environments/environment';
import { updateInterval } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CloudStorageAPI } from '@services/nx-cloud-api/cloud-services/cloud-storage/cloud-storage-api';
import { nxConfig } from '@services/nx-config/config';
import { IConfig } from '@services/nx-config/config-types';
import { NxPollService } from '@services/poll.service';
import { PermissionManagerModule } from '@services/system/modules/resource-managers/permission-manager';
import { NxSystemModuleBase } from '@services/system/system-module';
import { NxSystemAPIService } from '@services/system-api.service';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { PermissionManager } from '@services/system.service/permission-manager/permission-manager';
import { cleanId, KeyFilter } from '@utils/general';
import { memoizeAsyncPersistent, memoizeDecorator } from '@utils/memoize';
import { setServerIpAndPort } from '@utils/nx';

import type { MediaServersAndCameras } from '../../system-api.aggregated-types';
import {
    EventRule,
    EventTypes,
    PtzCommand,
    RawRule,
    SystemConfigSettings,
    ec2CameraEx,
} from '../../system-api.types';
import { NxSystemAPI } from '../../system-legacy-api.service';
import { CameraManager } from '../../system.service/camera-manager/camera-manager';
import { CloudStorageManager } from '../../system.service/cloud-storage-manager/cloud-storage-manager';
import { LicenseManager } from '../../system.service/license-manager/licence-manager';
import { ServerManager } from '../../system.service/server-manager/server-manager';
import { NxSystem } from '../../system.service/system';
import { NxMediaServer, ServerPreprocess, ServerTimeInfo } from '../../system.service/system-types';
import { UserManager } from '../../system.service/user-manager/user-manager';
import { NxUser, CloudUserCompat } from '../../system.service/user-manager/user-manager-types';
import { NxSystemsService } from '../../systems.service';
import { NxSystemBase } from '../system-base';

import { UserManagerModule } from './resource-managers/user-manager';

/**
 * @deprecated
 * This module is deprecated and will be removed in the future.
 *
 * We're breaking off specific functionality into their own sub modules.
 *
 * We're following the strangler pattern so as we finish the sub module(s) to replace specific functionality we remove the functionality from this module.
 *
 * This will help us track what functionality is still in use and what functionality is no longer in use as well as raise any issues with code still trying to use the old methods/properties.
 *
 * Old notes kept for reference:
 *
 * NxSystem has been largely refactored with a lot of methods being deprecated.
 *
 * Most behavior has been moved to manager classes.
 *
 * If your IDE shows a method as deprecated that means that is should probably be accessed from a manager class.
 *
 * Class methods have been organized with methods that are fine at the top, methods to be refactored and moved in the middle, and deprecated at the end.
 *
 * The manager classes to use should be documented on the method.
 *
 * TODO: Cleanup references to deprecated methods when you come accross them.
 * If there are only a few references left to that method, then remove those references and delete the deprecated method.
 */

@NxSystemModuleBase.checkStatic
export class NxSystemOldModule extends NxSystemModuleBase {
    static moduleSymbol = Symbol('NxSystemOld');

    getModuleSymbol = (): symbol => NxSystemOldModule.moduleSymbol;

    supportedVersions = [0, 5.0, 5.1, 5.2] as const;

    id: string = '';
    canMerge: boolean = false;

    private _isAvailable: boolean = false;
    stateMessage: string = '';
    isOnline: boolean = true;
    info: Record<string, any>;
    mergeInfo: MergeInfo;
    cloudStorageSystemEnabled: boolean = false;
    cloudStorageCapable: boolean = false;
    mediaservers: NxMediaServer[] = null;

    CONFIG: IConfig;
    LANG = staticLang;

    /**
     * @deprecated
     * This is a tempory way to handle the this context while we're still in the
     * process of strangling the old system module.
     *
     * CameraManager and ServerManager have been moved to their own sub modules
     * and are being referenced correctly from within system proxy object.
     *
     * Once we move the final coupled code out of this module we can remove this.
     */
    get proxied(): typeof this {
        return NxSystemBase.PROXIES.get(this.systemId) as typeof this;
    }

    /**
     * Need to figure out how we're going to break the coupling between UserManager and UserGroupsManager before we can remove this.
     */
    userManager: UserManager; // TODO: Reconcile usermanager with groups type

    /**
     * Managers removed from this module but types are left for since there's still references to them.
     *
     * These should be removed once the refactors remore the references.
     */
    cameraManager: CameraManager;
    serverManager: ServerManager;
    permissionManager: PermissionManager;
    version = 0;

    private _subscribersCount = new BehaviorSubject<number>(0);
    private attempts = 0; // used to limit consecutive api call attempts

    activeSubscription: Subscription;
    show404 = false;
    currentUserEmail: string;
    mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3;
    currentBusyServerIds = new Set();

    useRest: boolean;
    readonly apiRequestAttempts: number = 4;

    infoPromise: Promise<this>;
    updatePromise: Promise<any>;
    usersPromise: Promise<void>;
    systemPoll: Subscription | Observable<string | NxSystemOldModule>;
    licensesModifiedSubject = new BehaviorSubject<string>('');
    connectionSubject = new BehaviorSubject<boolean>(false);
    infoSubject = new BehaviorSubject<NxSystemOldModule>(undefined);

    get subscriberCount() {
        return this._subscribersCount.getValue();
    }

    set subscriberCount(count) {
        this._subscribersCount.next(count);
    }

    get isAvailable() {
        return this._isAvailable;
    }

    set isAvailable(value) {
        this._isAvailable = value;
        this.updateSystemState();
    }

    get lostConnection() {
        return this.connectionSubject.getValue();
    }

    set lostConnection(value) {
        this.connectionSubject.next(value);
    }

    get licensesModified() {
        return this.licensesModifiedSubject.getValue();
    }

    set licensesModified(value) {
        this.licensesModifiedSubject.next(value);
    }

    get systemInfo() {
        return this.infoSubject.getValue();
    }

    set systemInfo(system: NxSystemOldModule) {
        this.infoSubject.next(system);
    }

    @memoizeAsyncPersistent
    private getSystemCapabilities() {
        return this.mediaserver
            .getSystemSettings()
            .then(({ specificFeatures }) => specificFeatures);
    }

    private cloudApi: NxCloudApiService;
    private systemApiService: NxSystemAPIService;
    private pollService: NxPollService;
    private systemsService: NxSystemsService;
    private ribbonService: NxRibbonService;
    private router: Router;
    public injector: Injector;

    constructor(
        currentUserEmail: string,
        public systemId?: string,
        serverId?: string,
        userId?: string,
        version?: number,
    ) {
        super();
        const injector = NxSystemBase.INJECTOR;
        this.cloudApi = injector.get(NxCloudApiService);
        this.systemApiService = injector.get(NxSystemAPIService);
        this.pollService = injector.get(NxPollService);
        this.systemsService = injector.get(NxSystemsService);
        this.ribbonService = injector.get(NxRibbonService);
        this.router = injector.get(Router);

        this.CONFIG = nxConfig;
        // Sometimes newly connected systems don't report version correctly
        this.version = version;
        this.useRest = Math.floor(this.version) > 4;
        this.lostConnection = false;
        this.initSystem(currentUserEmail, systemId, serverId, userId);
        // Todo: Figure out when to enable it for webadmin
        // !environment.isLocal && firstValueFrom(this.getLicenseManager());
        this.getCloudStorageManager(this.cloudApi.cloudStorageApi);
    }

    private updateSystemState(): void {
        this.stateMessage = '';
        if (!this.isAvailable) {
            this.stateMessage = this.LANG.system.status.unavailable;
        }
        if (!this.isOnline) {
            this.stateMessage = this.LANG.system.status.offline;
        }
    }

    initSystem = (
        currentUserEmail: string,
        systemId?: string,
        serverId?: string,
        userId?: string,
    ): void => {
        this.id = systemId || serverId;
        this.info = { name: '' };
        this.currentUserEmail = currentUserEmail;

        /* Unauthorised request handler
           Some options here:
            - Access was revoked
            - System was disconnected from cloud\Password was changed
            - Nonce expired
           We try to update nonce and auth on the server again
           Other cases are not distinguishable
        */
        const unauthorizedCallback = this.useRest
            ? force => this.updateToken(force)
            : force => this.updateSystemAuth(force);
        if (!this.mediaserver) {
            this.mediaserver = this.systemApiService.createConnection(
                currentUserEmail,
                systemId,
                serverId,
                unauthorizedCallback,
                this.version,
            );
        }
        // Handling promise to satisfy the linter.
        if (!this.useRest || !(<NxSystemRestAPI>this.mediaserver)?.accessToken) {
            unauthorizedCallback(true).then(() => {});
        }

        /**
         * We're temporarily using UserManagerModule this way until the mediaserver has been refactored out of NxSystemOldModule.
         */
        const userManagerModule = new UserManagerModule(
            this.version,
            this.mediaserver as NxSystemRestAPI3,
            currentUserEmail,
            userId,
        );
        this.userManager = userManagerModule.userManager;

        const permissionManagerModule = new PermissionManagerModule(
            this.mediaserver as NxSystemRestAPI3,
        );
        this.permissionManager = permissionManagerModule.permissionManager;
        this.systemPoll = this.pollService.createPoll<any>(() => this.update(), updateInterval);
    };

    updateSystemAuth = (force = true) => {
        if (environment.isLocal || (!force && this.mediaserver?.authGet)) {
            // no need to update
            return Promise.resolve(true);
        }

        return this.cloudApi
            .getSystemAuth(this.id)
            .toPromise()
            .then(authKeys => {
                this.mediaserver.setAuthKeys(
                    authKeys.authGet,
                    authKeys.authPost,
                    authKeys.authPlay,
                );
                return Promise.resolve(true);
            })
            .catch(() => {
                firstValueFrom(this.mediaserver.ping()).catch(() => {
                    this.lostConnection = true;
                });
            });
    };

    updateToken = async (force = true) => {
        if (!this.mediaserver) {
            if (!this.proxied.serverManager) {
                return '';
            }
            // await this.serverManager.initSystemMediaServers();
        }
        const accessToken = (<NxSystemRestAPI>this.mediaserver).accessToken;
        if (environment.isLocal || (!force && accessToken)) {
            return Promise.resolve(accessToken);
        }

        return this.cloudApi
            .getSystemToken(this.id)
            .toPromise()
            .then(tokens => {
                return (<NxSystemRestAPI>this.mediaserver)
                    .setTokens(tokens, true)
                    .toPromise()
                    .then(() => tokens.access_token)
                    .catch(() => tokens.access_token);
            })
            .catch(() => {
                this.lostConnection ||= this.isOnline;
                return '';
            });
    };

    canViewLayouts() {
        return (
            this.version >= 5.1 &&
            nxConfig.featureFlags.layouts &&
            (nxConfig.featureFlags.restCookieLogin || !this.info.system2faEnabled) &&
            (nxConfig.featureFlags.layoutsNonChrome ||
                // @ts-expect-error chrome property only exist on chromium browsers
                // eslint-disable-next-line nx/ban-global-variables
                !!window.chrome)
        );
    }

    canUserViewCloudStorage() {
        if (!this.CONFIG.featureFlags.cloudStorage || environment.isLocal) {
            return false;
        }
        const isOwner = this.permissionManager.isOwner();
        return (
            (this.CONFIG.featureFlags.cloudStorage && isOwner) ||
            (this.permissionManager.isAdmin() && this.systemInfo?.cloudStorageSystemEnabled) ||
            (this.systemInfo?.cloudStorageCapable && isOwner)
        );
    }

    getInfoFromCloudDb() {
        return this.cloudApi.systems(this.id);
    }

    getInfoAndPermissions(useCache = true, suppressUpdate = false): Promise<this> {
        const parseSettings = ({
            cloudAccountName: ownerAccountEmail,
            systemName,
            specificFeatures,
            mergeInfo,
        }: SystemConfigSettings) => {
            let capabilities = {};
            try {
                capabilities = JSON.parse(<any>specificFeatures);
            } catch {
                capabilities = specificFeatures;
            }

            return {
                ownerAccountEmail,
                systemName,
                mergeInfo,
                capabilities,
                isOnline: true,
            };
        };

        if (environment.isLocal) {
            const systemPromise = Promise.resolve(this);
            return this.mediaserver
                .getSystemSettings()
                .then(
                    (res: any) => {
                        let parsedSettings: any = {};
                        if (Object.keys(res).length) {
                            parsedSettings = parseSettings(res);
                        }
                        const currentUser = {
                            ...this.userManager.currentUser,
                        };
                        delete currentUser.name;
                        Object.assign(parsedSettings, currentUser);
                        if (this.info) {
                            Object.assign(this.info, parsedSettings); // Update
                        } else {
                            this.info = parsedSettings;
                        }
                        if (environment.isLocal && !this.info.name) {
                            this.info.name = this.CONFIG.system.name;
                        }
                        this.id = parsedSettings?.id || this.CONFIG.localSystemId;
                        this.mergeInfo = this.info.mergeInfo;
                        this.isOnline = true;
                        this.cloudStorageCapable = false;

                        this.getUsers(true, suppressUpdate).then(() => {
                            this.userManager.ownerEmail = this.info.ownerAccountEmail;
                            this.permissionManager.ownerEmail.set(this.info.ownerAccountEmail);
                            this.permissionManager.checkCurrentUser();
                        });
                        return systemPromise;
                    },
                    err => {
                        console.error('getSystemSettings: ', err);
                        return systemPromise;
                    },
                ) // catch api error
                .catch(err => {
                    console.error('getInfoAndPermissions: ', err);
                    return systemPromise;
                }); // catch result processing error
        }

        return this.systemsService
            .getSystemAsPromise(this.id, useCache)
            .then(async response => {
                const error = this.cloudApi.checkResponseHasError(response);
                if (error) {
                    return Promise.reject(error);
                }

                if (!response) {
                    return Promise.reject({ data: { resultCode: 'forbidden' } });
                }
                let directCapabilities = {};
                try {
                    if (this.permissionManager.isAdmin()) {
                        directCapabilities = (await this.getSystemCapabilities()) || {};
                    }
                    response.capabilities = { ...response.capabilities, ...directCapabilities };
                } catch (e) {}
                if (this.info) {
                    Object.assign(this.info, response); // Update
                } else {
                    this.info = response;
                }
                this.userManager.ownerEmail = this.info.ownerAccountEmail;
                this.permissionManager.ownerEmail.set(this.info.ownerAccountEmail);
                this.isOnline = this.info.stateOfHealth === this.CONFIG.system.status.online;
                const capabilities = this.info?.capabilities || {}; // Make capabilities defined so that its easier to check feature flags.
                this.canMerge = this.permissionManager.isOwner() && 'cloudMerge' in capabilities;
                this.cloudStorageCapable = '5_1_cloud_storage' in capabilities;
                if (this.cloudStorageCapable) {
                    // Cloud storage backend is currently not ready. Removed for CB-1657
                    // this.cloudStorageSystemEnabled = await this.cloudApi.getCloudStorageUsage(this.info.id).then(() => true, () => false);
                    this.cloudStorageSystemEnabled = false;
                }

                // @ts-expect-error TODO: Check if property appears when merge in progress
                this.mergeInfo = response.mergeInfo;

                if (!suppressUpdate) {
                    this.systemInfo = this;
                }
                if (!this.userManager.accessRole) {
                    this.userManager.accessRole = this.info.accessRole;
                }
                return Promise.resolve(this);
            })
            .catch(_ => {
                return Promise.reject();
            });
    }

    getInfo(force?, useCache = true, suppressUpdate = false): Promise<this> {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = (
                (!environment.isLocal && this.mediaserver.unauthorizedCallback(false)) ||
                Promise.resolve(true)
            ).then(() => {
                return this.getInfoAndPermissions(useCache, suppressUpdate).then(res => {
                    return res;
                });
            });
        }
        return this.infoPromise;
    }

    startPoll(systemId?: string): void {
        if (this.subscriberCount === 0) {
            if (
                environment.isLocal ||
                this.mediaserver?.authGet ||
                (<NxSystemRestAPI>this.mediaserver).accessToken
            ) {
                this.subscriberCount++;
                this.activeSubscription =
                    this.systemPoll instanceof Observable &&
                    this.systemPoll.pipe(auditTime(100)).subscribe(() => {
                        this.systemInfo = this;
                    });
            } else {
                setTimeout(() => this.startPoll(systemId), 50);
            }
        } else if (!systemId || this.id !== systemId) {
            this.subscriberCount++;
        }
    }

    stopPoll(): void {
        if (this.subscriberCount > 1) {
            this.subscriberCount--;
        } else {
            if (this.activeSubscription instanceof Subscription) {
                this.activeSubscription.unsubscribe();
            }

            this.infoPromise = undefined;
            this.usersPromise = undefined;
            // this.systemInfo = undefined;
            this.subscriberCount = 0;
        }
    }

    update = (): Promise<any> => {
        if (!this.updatePromise) {
            this.updatePromise = this.getInfo(true, false, true)
                .then(() =>
                    this.isOnline
                        ? this.proxied.cameraManager.updateSystemServersCameras()
                        : Promise.reject({ offline: true }),
                )
                .then(() => this.proxied.serverManager.getForceServers(false).toPromise())
                .then(() => (environment.isLocal ? Promise.resolve() : this.getUsers(true, true)))
                .catch(error => {
                    if (error?.offline) {
                        firstValueFrom(this.mediaserver.ping()).catch(() => {
                            this.isOnline = false;
                            const { url } = this.router;
                            if (
                                ['view', 'layouts', 'bookmarks', 'health', 'monitoring'].every(
                                    route => !url.includes(route),
                                )
                            ) {
                                this.ribbonService.show(
                                    this.LANG.ribbon.systemOffline,
                                    [],
                                    'alert',
                                    undefined,
                                    true,
                                );
                            }
                            this.isAvailable = false;
                            this.systemInfo = this;
                        });
                    }
                    this.lostConnection = error?.data && error.data.resultCode === 'forbidden';
                })
                .finally(() => {
                    this.updatePromise = undefined;
                    // TODO: re-do ribbonService to handle multiple pages better
                    const { url } = this.router;
                    if (this.isAvailable && url.includes('systems')) {
                        this.ribbonService.hide();
                    }
                });
        }
        return this.updatePromise;
    };

    updateOrGetSystemSettings(updateParams = {}) {
        return this.mediaserver.updateOrGetSettings(updateParams);
    }

    authPromise: Promise<any>;

    ensureSystemAuth(force?) {
        if (environment.isLocal) {
            return Promise.resolve();
        }

        if (this.authPromise) {
            return this.authPromise;
        }

        if (
            !force &&
            (this.mediaserver?.authGet || (<NxSystemRestAPI>this.mediaserver).accessToken)
        ) {
            return Promise.resolve(true);
        }

        this.authPromise = this.mediaserver.unauthorizedCallback(true).then((auth: any) => {
            if (auth.authGet) {
                this.mediaserver.setAuthKeys(auth.authGet, auth.authPost, auth.authPlay);
                this.authPromise = null;
            } else if (auth.access_token) {
                (this.mediaserver as NxSystemRestAPI).setTokens(auth, true).subscribe(() => {});
            } else {
                this.authPromise = null;
                return Promise.reject(auth);
            }
            return Promise.resolve(true);
        });

        return this.authPromise;
    }

    public getMediaServersAndCameras(force: boolean = false): Promise<NxMediaServer[]> {
        if (this.mediaservers && !force) {
            return Promise.resolve(this.mediaservers);
        }

        return this.ensureSystemAuth().then(() => {
            return this.mediaserver
                .getMediaServersAndCameras()
                .toPromise()
                .then(
                    response => {
                        if ((response.error && response.error !== '0') || !response.reply) {
                            console.error('error getting mediaservers and cameras');
                            return [];
                        }
                        return this.processMediaServersAndCameras(response);
                    },
                    err => {
                        console.error('getMediaServersAndCameras failure', err);
                        return [];
                    },
                );
        });
    }

    protected processMediaServersAndCameras(apiReply: MediaServersAndCameras): NxMediaServer[] {
        const msIds = [
            // 'authKey',
            'id',
            // 'metadataStorageId',
            // 'typeId',
        ] satisfies KeyFilter<ServerPreprocess, string>[];
        const camIds = ['id', 'parentId', 'preferredServerId', 'typeId'] satisfies KeyFilter<
            ec2CameraEx,
            string
        >[];
        // ID properties with enclosing brackets {} that we want to trim
        // while ignoring JSON strings
        const mediaServers = apiReply.reply['/ec2/getMediaServers'].map(ms => {
            msIds.forEach(id => {
                ms[id] = cleanId(ms[id]);
            });
            return ms;
        });
        const cameras = apiReply.reply['/ec2/getCamerasEx'].map(cam => {
            camIds.forEach(id => {
                cam[id] = cleanId(cam[id]);
            });
            return cam;
        });

        this.mediaservers = mediaServers.map(ms => ({
            ...setServerIpAndPort(ms),
            cameras: cameras.filter(c => c.parentId === ms.id),
        }));
        return this.mediaservers;
    }

    public getBookmarks() {
        return this.mediaserver.getBookmarks?.();
    }

    public getPlaybackUrl(cameraId, transport, resolution, position) {
        return this.mediaserver.getPlaybackUrl(cameraId, transport, resolution, position);
    }

    public getCameraRecords(cameraId, startTime?, endTime?, detail?, limit?, label?, periodsType?) {
        return this.ensureSystemAuth().then(() =>
            this.mediaserver
                .getRecords(cameraId, startTime, endTime, detail, limit, label, periodsType)
                .toPromise(),
        );
    }

    public getServerTimes(): Promise<Array<ServerTimeInfo>> {
        return this.ensureSystemAuth().then(() => {
            return this.mediaserver
                .getServerTimes()
                .toPromise()
                .then(
                    r => {
                        if (!r?.reply) {
                            this.attempts++;
                            return this.attempts < this.apiRequestAttempts
                                ? this.getServerTimes()
                                : Promise.resolve([]);
                        }
                        this.attempts = 0;
                        const now = Date.now();
                        return r.reply.map(i => ({
                            vmsTime: parseInt(i.vmsTime),
                            vmsTimeOffset: now - parseInt(i.vmsTime),
                            osTimeOffset: now - parseInt(i.osTime),
                            serverId: i.serverId.slice(1, i.serverId.length - 1),
                            timeZoneOffset: parseInt(i.timeZoneOffset),
                        }));
                    },
                    err => {
                        if (
                            err.name === 'TimeoutError' &&
                            this.attempts < this.apiRequestAttempts
                        ) {
                            this.attempts++;
                            return this.getServerTimes();
                        }

                        this.attempts = 0;
                        return Promise.reject(err);
                    },
                );
        });
    }

    public ptz(ptzCommand: PtzCommand) {
        return this.mediaserver.ptz(ptzCommand);
    }

    public getLicenseServerApi() {
        let _cloudHost = '';
        return this.updateOrGetSystemSettings().pipe(
            map(
                ({
                    reply: {
                        settings: { licenseServer, cloudHost },
                    },
                }) => {
                    _cloudHost = cloudHost;
                    return licenseServer;
                },
            ),
            catchError(() => Promise.resolve('')),
            switchMap(licenseServer => this.cloudApi.checkLicenseServer(this.id, licenseServer)),
            map(({ licenseServer }) =>
                this.cloudApi.licenseServerApiFactory(licenseServer, () => _cloudHost),
            ),
        );
    }

    public getLicenseManager() {
        return this.getLicenseServerApi().pipe(
            map(licenseServerApi =>
                LicenseManager.getInstance(licenseServerApi, this as NxSystem, this.systemsService),
            ),
        );
    }

    public getCloudStorageManager(cloudStorageApi: CloudStorageAPI) {
        return CloudStorageManager.getInstance(cloudStorageApi, this as NxSystem);
    }

    /**
     * Alexa event rule handlers
     */
    /**
     * Handles rules that need to be added/removed when enabling/disabling Alexa
     */
    updateAlexaRules(enabled = true) {
        return this.mediaserver
            .getEventRules()
            .pipe(
                switchMap(existingRules =>
                    (enabled ? this.#addAlexaRules : this.#removeAlexaRules)(
                        existingRules,
                        this.userManager.currentUser,
                        `"Alexa layout command for ${this.userManager.currentUser.email}"`,
                        `"Alexa command for ${this.userManager.currentUser.email}"`,
                    ),
                ),
            );
    }

    #addAlexaRules = async (
        existingRules: EventRule[],
        user: NxUser,
        alarmResourceName: string,
        doCommandResourceName: string,
    ) => {
        const showAlarmRule = NxSystemOldModule.createRule(
            {
                eventCondition: NxSystemOldModule.getEventCondition(alarmResourceName)(),
                actionType: 'showOnAlarmLayoutAction',
                eventType: EventTypes.USER_DEFINED,
                actionParams: NxSystemOldModule.getActionParams([user.id, user.id], true),
            },
            existingRules,
        );

        const doCommandRule = NxSystemOldModule.createRule(
            {
                eventCondition: NxSystemOldModule.getEventCondition(doCommandResourceName)(),
                actionType: 'showPopupAction',
                eventType: EventTypes.USER_DEFINED,
                actionParams: NxSystemOldModule.getActionParams([user.id, user.id], true),
            },
            existingRules,
        );
        return Promise.all(
            [showAlarmRule, doCommandRule].map(rule =>
                this.mediaserver.saveEventRule(rule).toPromise(),
            ),
        ).catch(errors => {
            console.error(errors);
            return false;
        });
    };

    #removeAlexaRules = async (
        existingRules: EventRule[],
        user: NxUser,
        alarmResourceName: string,
        doCommandResourceName: string,
    ) => {
        const toRemove = existingRules.filter(({ eventCondition }) =>
            [alarmResourceName, doCommandResourceName].some(resourceName => {
                const condition = JSON.parse(eventCondition) || {};

                return condition.resourceName === resourceName;
            }),
        );

        return Promise.all(
            toRemove.map(({ id }) =>
                this.mediaserver
                    .removeEventRule(id)
                    .toPromise()
                    .catch(errors => errors),
            ),
        );
    };

    /**
     * Event Helpers
     */
    static getActionParams = (
        [actionResourceId, ...additionalResources]: string[],
        useSource = false,
    ) => ({
        allUsers: false,
        authType: 'authBasicAndDigest',
        durationMs: 600000,
        forced: true,
        fps: 30,
        needConfirmation: false,
        playToClient: true,
        recordAfter: 5,
        recordBeforeMs: 5000,
        requestType: '',
        streamQuality: 'highest',
        useSource,
        actionResourceId,
        additionalResources,
    });

    static getEventCondition =
        (resourceName: string, noDescription = false) =>
        (...valuesToParse: string[]) => {
            const lookupGroupAliases = (groupName: string) => {
                const aliases = {
                    all: ['everyone'],
                    Administrator: ['admin', 'admins'],
                    'Advanced Viewer': ['advanced'],
                    Viewer: ['viewers'],
                    'Live Viewer': ['live viewers'],
                };
                return [groupName, ...(aliases[groupName] || [])];
            };
            const toCondition = (value: string) => {
                const cleaned = value.replace('Alexa ', '').toLowerCase();
                const split = cleaned.split(' ');
                return split.length === 1 ? cleaned : `"${cleaned}" ${split.join(' ')}`;
            };
            const condition = valuesToParse
                .reduce((values, cur) => [...values, ...lookupGroupAliases(cur)], [])
                .reduce((conditions, condition) => `${conditions} ${toCondition(condition)}`, '');

            return {
                caption: condition,
                description: noDescription ? '' : condition,
                eventTimestampUsec: '0',
                eventType: 'undefinedEvent',
                metadata: {
                    allUsers: false,
                    level: '0',
                },
                omitDbLogging: false,
                reasonCode: 'none',
                resourceName,
            };
        };

    static baseRule = {
        system: false,
        schedule: '',
        eventState: 'Undefined',
        disabled: false,
        aggregationPeriod: 0,
    };

    static getRuleId = (caption: string, actionType: string, existingRules: EventRule[]) => {
        const existingRulesTuples = existingRules.map(
            ({ eventCondition, actionType, id }): [string, string, string] => [
                JSON.parse(eventCondition).caption || '',
                actionType,
                id,
            ],
        );
        const existingRule = existingRulesTuples.find(
            ([cap, action]) => cap === caption && action === actionType,
        );
        return existingRule?.[2] || `{${uuid()}}`;
    };

    static createRule = (
        { actionParams, eventCondition, ...rule }: RawRule,
        existingRules: EventRule[],
    ): EventRule => ({
        id: NxSystemOldModule.getRuleId(eventCondition.caption, rule.actionType, existingRules),
        ...NxSystemOldModule.baseRule,
        ...rule,
        actionParams: JSON.stringify(actionParams),
        eventCondition: JSON.stringify(eventCondition),
    });

    private updateLicenses$ = new BehaviorSubject(0);

    @memoizeDecorator(function (this: NxSystem) {
        return stringify({
            servers: this.proxied.serverManager.servers.map(server => server.id),
        });
    })
    private aggregateLicenseFactory() {
        return this.updateLicenses$.pipe(
            switchMap(() =>
                forkJoin({
                    times: this.getServerTimes(),
                    hardwareIds: this.mediaserver.getHardwareIdsOfServers(),
                    licensesInfo: this.mediaserver.getLicenses(),
                }),
            ),
            shareReplay({ bufferSize: 1, refCount: false, windowTime: 10 * 60 * 1000 }),
        );
    }

    public getAggregateLicenseInfo() {
        this.updateLicenses$.next(Date.now());
        return this.aggregateLicenseFactory();
    }

    /**
     * Methods and properties below need to be refactored and moved to respective manager classes.
     *
     * TODO: Refactor methods to be able to be used from within manager classes.
     */
    /**
     * TODO: This method needs to be refactored and moved into userManager.
     * @deprecated Not really deprecated yet but should be soon.
     */
    getUsersCachedInCloud(): Promise<CloudUserCompat[]> {
        this.isAvailable = false;
        return this.cloudApi
            .users(this.id)
            .toPromise()
            .then(data => {
                return data.map<CloudUserCompat>(user => ({
                    ...user,
                    isCloud: true,
                    permissions: this.userManager.normalizePermissionString(user.customPermissions),
                    email: user.accountEmail,
                    id: user.accountId,
                    fullName: user.accountFullName,
                    name: user.accountEmail,
                    isLdap: false,
                }));
            })
            .catch(err => err);
    }

    /**
     * TODO: This method needs to be refactored and moved into userManager.
     * @deprecated Not really deprecated yet but should be soon.
     */
    getUsers(reload?: boolean, suppressUpdate = false): Promise<void> {
        if (!this.usersPromise || reload) {
            let usersPromise: Promise<void>;
            if (this.isOnline) {
                // Two separate cases - either we get info from the system (presuming it has actual names)
                usersPromise = this.userManager
                    .getUsersDataFromTheSystem()
                    .then(() => {
                        this.isAvailable = true;
                    })
                    .catch(() => {
                        if (!environment.isLocal && this.permissionManager.isAdmin()) {
                            return this.getUsersCachedInCloud().then(users => {
                                this.userManager.processUsers(users);
                                return Promise.resolve();
                            });
                        } else {
                            return Promise.resolve();
                        }
                    });
            } else if (!environment.isLocal && this.permissionManager.isAdmin()) {
                // or we get old cached data from the cloud
                usersPromise = this.getUsersCachedInCloud().then(users => {
                    return this.userManager.processUsers(users);
                });
            } else {
                this.isAvailable = false;
                usersPromise = Promise.resolve();
            }

            this.usersPromise = usersPromise.then(() => {
                this.permissionManager.checkCurrentUser();
                // If system is reported to be online - try to get actual users list
                if (!suppressUpdate) {
                    this.systemInfo = this;
                }
            });
        }
        return this.usersPromise;
    }

    deleteFromCurrentAccount(password?: string) {
        const currentUser = this.userManager.currentUser;
        const email = currentUser ? currentUser.email : this.userManager.currentUserEmail;
        if (this.isAvailable && currentUser) {
            // Try to remove me from the system directly
            this.userManager.deleteUser(currentUser).catch(err => {
                console.info('Failed to removed from system directly');
                console.error(err);
            });
        }
        // Anyway - send another request to cloud_db to remove my this
        const id = environment.isLocal ? this.CONFIG.cloudSystemId : this.id;
        return this.cloudApi.unshare(id, email, password);
    }
}
