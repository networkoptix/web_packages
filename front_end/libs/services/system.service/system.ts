import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
    BehaviorSubject,
    Subscription,
    Observable
} from 'rxjs';
import { auditTime, catchError, map, switchMap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { environment } from '@environments/environment';
import { CloudStorageAPI } from '@services/nx-cloud-api/cloud-services/cloud-storage/cloud-storage-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';

import { NxCloudApiService } from '../nx-cloud-api';
import { NxPollService } from '../poll.service';
import { NxSystemAPIService } from '../system-api.service';
import {
    EventRule,
    EventTypes,
    RawRule,
    SystemConfigSettings
} from '../system-api.types';
import { NxSystemAPI } from '../system-legacy-api.service';
import { NxSystemsService } from '../systems.service';

import { CameraManager } from './camera-manager/camera-manager';
import type { ICamera, ITask } from './camera-manager/camera-manager-types';
import { CloudStorageManager } from './cloud-storage-manager/cloud-storage-manager';
import { LicenseManager } from './license-manager/licence-manager';
import { ServerManager } from './server-manager/server-manager';
import { StorageManager } from './storage-manager/storage-manager';
import type { NxMediaServer, ServerTimeInfo } from './system-types';
import { UserManager } from './user-manager/user-manager';
import type {
    NxSystemUser,
    NxSystemRole
} from './user-manager/user-manager-types';

/* Api response cleaners */
export function trimId(id) {
    if (!id || !id.length || typeof id !== 'string') { return id; }
    if (id[0] === '{' && id[id.length - 1] === '}') {
        return id.slice(1, id.length - 1);
    } else {
        return id;
    }
}

function trimIds(o) {
    const result = { ...o };

    const idFields = [
        'id',
        'parentId',
        'preferredServerId',
        'authKey',
        'metadataStorageId',
        'typeId'
    ];

    idFields.forEach(idField => {
        if (idField in o) {
            result[idField] = trimId(o[idField]);
        }
    });
    return result;
}

// function tryToParseJSON(v) {
//     try {
//         return JSON.parse(v);
//     } catch {
//         return trimId(v);
//     }
// }

/**
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
export class NxSystem {
    LATEST = 5.1;
    id: string = '';
    canMerge: boolean = false;

    private _isAvailable: boolean = false;
    stateMessage: string = '';
    isOnline: boolean = false;
    info: Record<string, any>;
    mergeInfo: Record<string, any>;
    cloudStorageSystemEnabled: boolean = false;
    cloudStorageCapable: boolean = false;
    mediaservers: NxMediaServer[] = null;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    userManager: UserManager;
    serverManager: ServerManager;
    cameraManager: CameraManager;
    storageManager: StorageManager;
    version = 0;

    private _subscribersCount = new BehaviorSubject<number>(0);
    private attempts = 0; // used to limit consecutive api call attempts

    activeSubscription: Subscription;
    show404 = false;
    currentUserEmail: string;
    mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2;
    currentServerNotBusy: boolean = true;
    currentBusyServerIds = new Set();
    systemIdInit: string;
    serverIdInit: string;
    userIdInit: string;
    useRest: boolean;

    infoPromise: Promise<this>;
    updatePromise: Promise<any>;
    usersPromise: Promise<void>;
    systemPoll: Subscription | Observable<string | NxSystem>;
    licensesModifiedSubject = new BehaviorSubject<string>('');
    connectionSubject = new BehaviorSubject<boolean>(false);
    infoSubject = new BehaviorSubject<NxSystem>(undefined);

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

    set systemInfo(system: NxSystem) {
        this.infoSubject.next(system);
    }

    private getSystemCapabilities() {
        return this.mediaserver.getSystemSettings()
            .then(({ specificFeatures }) => specificFeatures);
    }

    constructor(
        CONFIG: IConfig,
        LANG: LanguageI18NStaticTypes,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private ribbonService: NxRibbonService,
        private router: Router,
        private translateService: TranslateService,
        private locale: string,
        currentUserEmail: string,
        systemId?: string,
        serverId?: string,
        userId?: string,
        version?: number,
    ) {
        this.CONFIG = CONFIG;
        this.LANG = LANG;
        // Sometimes newly connected systems don't report version correctly
        this.version = version || this.LATEST;
        this.useRest = Math.floor(this.version) > 4;
        this.lostConnection = false;
        this.initSystem(currentUserEmail, systemId, serverId, userId);
    }

    private updateSystemState(): void {
        this.stateMessage = '';
        if (!this.isAvailable) {
            this.stateMessage = this.LANG.system.status.unavailable?.();
        }
        if (!this.isOnline) {
            this.stateMessage = this.LANG.system.status.offline?.();
        }
    }

    initSystem(currentUserEmail: string, systemId?: string, serverId?: string, userId?: string): void {
        this.systemIdInit = systemId;
        this.serverIdInit = serverId;
        this.userIdInit = userId;
        this.id = systemId || serverId;
        this.info = { name: '' };
        this.mergeInfo = {};
        this.currentUserEmail = currentUserEmail;

        /* Unauthorised request handler
           Some options here:
            - Access was revoked
            - System was disconnected from cloud\Password was changed
            - Nonce expired
           We try to update nonce and auth on the server again
           Other cases are not distinguishable
        */
        const unauthorizedCallback = this.useRest ? force => this.updateToken(force) : force => this.updateSystemAuth(force);
        if (!this.mediaserver) {
            this.mediaserver = this.systemApiService.createConnection(currentUserEmail, systemId, serverId, unauthorizedCallback, this.version);
        }
        // Handling promise to satisfy the linter.
        if (!this.useRest || !(<NxSystemRestAPI> this.mediaserver)?.accessToken) {
            unauthorizedCallback(true).then(() => { });
        }

        this.userManager = new UserManager(this.CONFIG, this.LANG, this.mediaserver, currentUserEmail, userId, this.locale);
        this.systemPoll = this.pollService.createPoll<any>(() => this.update(), this.CONFIG.updateInterval);
        this.serverManager = new ServerManager(
            this.mediaserver,
            this.systemApiService,
            this.currentUserEmail,
            this.id,
            this.cloudApi,
            this,
            this.locale,
        );

        this.cameraManager = new CameraManager(
            this,
            this.locale,
        );

        this.storageManager = new StorageManager(this);
    }

    updateSystemAuth(force = true) {
        if (environment.isLocal || !force && this.mediaserver?.authGet) { // no need to update
            return Promise.resolve(true);
        }

        return this.cloudApi.getSystemAuth(this.id).toPromise().then(authKeys => {
            this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
            return Promise.resolve(true);
        }).catch(() => {
            this.lostConnection = true;
        });
    }

    updateToken(force = true) {
        const accessToken = (<NxSystemRestAPI> this.mediaserver).accessToken;
        if (environment.isLocal || !force && accessToken) {
            return Promise.resolve(accessToken);
        }

        return this.cloudApi.getSystemToken(this.id).toPromise().then(tokens => {
            return (<NxSystemRestAPI> this.mediaserver).setTokens(tokens, true)
                .toPromise()
                .then(() => tokens.access_token)
                .catch(() => tokens.access_token);
        }).catch(() => {
            this.lostConnection = true;
        });
    }

    /**
     * @deprecated Should be replaced with direct reference to userManager
     */
    canViewInfo() {
        // system's capability check was removed as health info page handles it by showing "outdated version" placeholder
        return this.userManager.permissions.isAdmin;
    }

    canUserViewCloudStorage() {
        if (!this.CONFIG.featureFlags.cloudStorage || environment.isLocal) {
            return false;
        }
        return (this.CONFIG.cloudCapabilities.cloudStorageEnabled && this.isMine) ||
            (this.isAdmin && this.systemInfo?.cloudStorageSystemEnabled) ||
            (this.systemInfo?.cloudStorageCapable && this.isMine);
    }

    getInfoFromCloudDb() {
        return this.cloudApi.systems(this.id);
    }

    getInfoAndPermissions(useCache = true, suppressUpdate = false): Promise<this> {
        const parseSettings = ({
            cloudAccountName: ownerAccountEmail,
            systemName,
            specificFeatures,
            mergeInfo
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
                isOnline: true
            };
        };

        if (environment.isLocal) {
            const systemPromise = Promise.resolve(this);
            return this.mediaserver.getSystemSettings()
                .then((res: any) => {
                    let parsedSettings: any = {};
                    if (Object.keys(res).length) {
                        parsedSettings = parseSettings(res);
                    }
                    const currentUser = { ...this.userManager.currentUser };
                    if (currentUser?.name) {
                        delete currentUser.name;
                    }
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

                    this.getUsers(true, suppressUpdate)
                        .then(() => {
                            this.userManager.ownerEmail = this.info.ownerAccountEmail;
                            this.userManager.checkPermissions();
                        });
                    return systemPromise;
                }, err => {
                    console.error('getSystemSettings: ', err);
                    return systemPromise;
                }) // catch api error
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
                    directCapabilities = (await this.getSystemCapabilities()) || {};
                    response.capabilities = { ...response.capabilities, ...directCapabilities };
                } catch (e) {
                }

                if (this.info) {
                    Object.assign(this.info, response); // Update
                } else {
                    this.info = response;
                }
                this.userManager.ownerEmail = this.info.ownerAccountEmail;
                this.isOnline = this.info.stateOfHealth === this.CONFIG.system.status.online;

                const capabilities = this.info?.capabilities || {}; // Make capabilities defined so that its easier to check feature flags.
                this.canMerge = this.userManager.isMine && 'cloudMerge' in capabilities;
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
            }).catch(_ => {
                return Promise.reject();
            });
    }

    getInfo(force?, useCache = true, suppressUpdate = false): Promise<this> {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = (!environment.isLocal && this.mediaserver.unauthorizedCallback(false) || Promise.resolve(true)).then(() => {
                return this.getInfoAndPermissions(useCache, suppressUpdate).then(res => {
                    return res;
                });
            });
        }
        return this.infoPromise;
    }

    startPoll(systemId?: string): void {
        if (this.subscriberCount === 0) {
            if (environment.isLocal || this.mediaserver?.authGet || (<NxSystemRestAPI> this.mediaserver).accessToken) {
                this.subscriberCount++;
                this.activeSubscription = this.systemPoll instanceof Observable &&
                    this.systemPoll.pipe(auditTime(1000)).subscribe(() => {
                        this.systemInfo = this;
                    });
            } else {
                setTimeout(() => this.startPoll(systemId), 1000);
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
                .then(() => this.isOnline ? this.cameraManager.updateSystemServersCameras() : Promise.reject({ offline: true }))
                .then(() => this.serverManager.getForceServers(false).toPromise())
                .then(() => environment.isLocal ? Promise.resolve() : this.getUsers(true, true))
                .catch(error => {
                    if (error?.offline) {
                        this.isOnline = false;
                        this.ribbonService.show(
                            this.LANG.ribbon.systemOffline(),
                            [],
                            'alert',
                            undefined,
                            true
                        );
                        this.isAvailable = false;
                        this.systemInfo = this;
                    }
                    this.lostConnection = error?.data && error.data.resultCode === 'forbidden';
                })
                .finally(() => {
                    this.updatePromise = undefined;
                    // TODO: re-do ribbonService to handle multiple pages better
                    const { url } = this.router;
                    if (this.isAvailable && url.includes('systems') && !url.includes('health')) {
                        this.ribbonService.hide();
                    }
                });
        }
        return this.updatePromise;
    };

    updateOrGetSystemSettings(updateParams = {}) {
        return this.mediaserver.updateOrGetSettings(updateParams);
    }

    /**
     * Method moved to storageManager.
     * @deprecated
     */
    getStorageStatus(queryParams) {
        return this.mediaserver.getStorageStatus(queryParams);
    }

    /**
     * Method moved to storageManager.
     * @deprecated
     */
    saveStorage<T>(updateParams?: T) {
        const typeId = '{f8544a40-880e-9442-b78a-9da6db6862b4}';
        return this.mediaserver.saveStorage({ ...updateParams, typeId });
    }

    removeStorage<T>(updateParams?: T) {
        return this.mediaserver.removeStorage(updateParams);
    }

    getStorages<T>(queryParams?: T) {
        return this.mediaserver.getStoragesInfo(queryParams);
    }

    getRemoteServerInfo(remoteEndpoint: string) {
        return this.mediaserver.getRemoteServerInfo(remoteEndpoint);
    }

    mergeSystems(url: string, targetSystemId: string, dryRun: boolean, currentPassword?: string, takeRemoteSettings = false) {
        return this.mediaserver.mergeSystems(url, targetSystemId, dryRun, currentPassword, takeRemoteSettings);
    }

    checkMergeStatus(forceReload = true) {
        return this.mediaserver.checkMergeStatus(forceReload);
    }

    getPeerSystems() {
        return this.mediaserver.getPeerSystems();
    }

    getHardwareIdsOfServers() {
        return this.mediaserver
            .getHardwareIdsOfServers()
            .toPromise();
    }

    getLicenses() {
        return this.mediaserver
            .getLicenses()
            .toPromise();
    }

    getLicenseSummaries() {
        return this.mediaserver
            .getLicenseSummaries()
            .toPromise();
    }

    authPromise: Promise<any>;

    ensureSystemAuth(force?) {
        if (environment.isLocal) {
            return Promise.resolve();
        }

        if (this.authPromise) {
            return this.authPromise;
        }

        if (!force && (this.mediaserver?.authGet || (<NxSystemRestAPI> this.mediaserver).accessToken)) {
            return Promise.resolve(true);
        }

        this.authPromise = this.mediaserver.unauthorizedCallback(true).then(
            (auth: any) => {
                if (auth.authGet) {
                    this.mediaserver.setAuthKeys(auth.authGet, auth.authPost, auth.authPlay);
                    this.authPromise = null;
                } else if (auth.access_token) {
                    (this.mediaserver as NxSystemRestAPI)
                        .setTokens(auth, true)
                        .subscribe(() => { });
                } else {
                    this.authPromise = null;
                    return Promise.reject(auth);
                }
                return Promise.resolve(true);
            }
        );

        return this.authPromise;
    }

    public getMediaServersAndCameras(force: boolean = false): any {
        if (this.mediaservers && !force) {
            return Promise.resolve(this.mediaservers);
        }

        return this.ensureSystemAuth()
            .then(
                () => this.mediaserver
                    .getMediaServersAndCameras().toPromise()
                    .then(
                        response => {
                            if ((response.error && response.error !== '0') || !response.reply) {
                                console.error('error getting mediaservers and cameras');
                                return response;
                            }
                            return this._setMediaServersAndCameras(response.reply);
                        }, err => {
                            console.error('getMediaServersAndCameras failure', err);
                            return [];
                        }));
    }

    protected _setMediaServersAndCameras(apiReply) {
        // `mss` stands for mediaservers, `cs` — for cameras
        const mss = apiReply['ec2/getMediaServersEx'] ||
            apiReply['/ec2/getMediaServersEx'];

        const cs = apiReply['ec2/getCamerasEx'].map(trimIds);

        this.mediaservers = mss.map(trimIds).map(ms => ({
            ...ms,
            cameras: cs.filter(c => c.parentId === ms.id)
        }));
        return this.mediaservers;
    }

    public getBookmarks() {
        return this.mediaserver.getBookmarks?.();
    }

    public getPlaybackUrl(cameraId, transport, resolution, position) {
        return this.mediaserver.getPlaybackUrl(cameraId, transport, resolution, position);
    }

    public getCameraHistoryItems() {
        return this.mediaserver.getCameraHistoryItems();
    }

    public getCameraRecords(cameraId, startTime?, endTime?, detail?, limit?, label?, periodsType?) {
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getRecords(
                cameraId, startTime, endTime, detail, limit, label, periodsType
            ).toPromise()
        );
    }

    public getExportUrl(params) {
        return this.mediaserver.getExportUrl(params);
    }

    public getServerTimes(): Promise<Array<ServerTimeInfo>> {
        return this.ensureSystemAuth().then(
            () => {
                return this.mediaserver.getServerTimes().toPromise()
                    .then(
                        r => {
                            this.attempts = 0;
                            const now = Date.now();
                            return r.reply.map(i => ({
                                vmsTime: parseInt(i.vmsTime),
                                vmsTimeOffset: now - parseInt(i.vmsTime),
                                osTimeOffset: now - parseInt(i.osTime),
                                serverId: i.serverId.slice(1, i.serverId.length - 1),
                                timeZoneOffset: parseInt(i.timeZoneOffset)
                            }));
                        }, err => {
                            if (err.name === 'TimeoutError' && this.attempts < this.CONFIG.apiRequestAttempts) {
                                this.attempts++;
                                return this.getServerTimes();
                            }

                            this.attempts = 0;
                            return Promise.reject(err);
                        });
            });
    }

    public getLicenseServerApi() {
        let _cloudHost = '';
        return this.updateOrGetSystemSettings().pipe(
            map(({ reply: { settings: { licenseServer, cloudHost } } }) => {
                _cloudHost = cloudHost;
                return licenseServer;
            }),
            catchError(() => Promise.resolve('')),
            switchMap(licenseServer => this.cloudApi.checkLicenseServer(this.id, licenseServer)),
            map(({ licenseServer }) => this.cloudApi.licenseServerApiFactory(licenseServer, _cloudHost || this.CONFIG.cloudHost))
        );
    }

    public getLicenseManager() {
        return this.getLicenseServerApi().pipe(
            map(licenseServerApi => new LicenseManager(licenseServerApi, this, this.systemsService, this.translateService)
            ));
    }

    public getCloudStorageManager(cloudStorageApi: CloudStorageAPI) {
        return new CloudStorageManager(cloudStorageApi, this, this.systemsService, this.translateService);
    }

    /**
     * Alexa event rule handlers
     */

    /**
     * Handles rules that need to be added/removed when enabling/disabling Alexa
     */
    updateAlexaRules(enabled = true) {
        return this.mediaserver.getEventRules().pipe(
            switchMap(existingRules => (enabled ? this.#addAlexaRules : this.#removeAlexaRules)(
                existingRules,
                this.userManager.currentUser,
                `"Alexa layout command for ${this.userManager.currentUser.email}"`,
                `"Alexa command for ${this.userManager.currentUser.email}"`
            ))
        );
    }

    #addAlexaRules = async (existingRules: EventRule[], user: NxSystemUser, alarmResourceName: string, doCommandResourceName: string) => {
        const showAlarmRule = NxSystem.createRule(
            {
                eventCondition: NxSystem.getEventCondition(
                    alarmResourceName
                )(),
                actionType: 'showOnAlarmLayoutAction',
                eventType: EventTypes.USER_DEFINED,
                actionParams: NxSystem.getActionParams([user.id, user.id], true)
            },
            existingRules
        );

        const doCommandRule = NxSystem.createRule(
            {
                eventCondition: NxSystem.getEventCondition(doCommandResourceName)(),
                actionType: 'showPopupAction',
                eventType: EventTypes.USER_DEFINED,
                actionParams: NxSystem.getActionParams([user.id, user.id], true)
            },
            existingRules
        );
        return Promise.all([
            showAlarmRule, doCommandRule
        ].map(rule => this.mediaserver.saveEventRule(rule).toPromise())).catch(errors => {
            console.error(errors);
            return false;
        });
    };

    #removeAlexaRules = async (existingRules: EventRule[], user: NxSystemUser, alarmResourceName: string, doCommandResourceName: string) => {
        const toRemove = existingRules.filter(({
            eventCondition
        }) => [
            alarmResourceName,
            doCommandResourceName
        ].some(resourceName => {
            const condition = JSON.parse(eventCondition) || {};

            return condition.resourceName === resourceName;
        }));

        return Promise.all(toRemove.map(({
            id
        }) => this.mediaserver.removeEventRule(id).toPromise().catch(errors => errors)));
    };

    /**
     * Event Helpers
     */

    static getActionParams = (
        [actionResourceId, ...additionalResources]: string[],
        useSource = false
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
        additionalResources
    });

    static getEventCondition = (
        resourceName: string,
        noDescription = false
    ) => (...valuesToParse: string[]) => {
        const lookupGroupAliases = (groupName: string) => {
            const aliases = {
                all: ['everyone'],
                Administrator: ['admin', 'admins'],
                'Advanced Viewer': ['advanced'],
                Viewer: ['viewers'],
                'Live Viewer': ['live viewers']
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
            .reduce(
                (conditions, condition) =>
                    `${conditions} ${toCondition(condition)}`,
                ''
            );

        return {
            caption: condition,
            description: noDescription ? '' : condition,
            eventTimestampUsec: '0',
            eventType: 'undefinedEvent',
            metadata: {
                allUsers: false,
                level: '0'
            },
            omitDbLogging: false,
            reasonCode: 'none',
            resourceName
        };
    };

    static baseRule = {
        system: false,
        schedule: '',
        eventState: 'Undefined',
        disabled: false,
        aggregationPeriod: 0
    };

    static getRuleId = (
        caption: string,
        actionType: string,
        existingRules: EventRule[]
    ) => {
        const existingRulesTuples = existingRules.map(
            ({ eventCondition, actionType, id }): [string, string, string] => [
                JSON.parse(eventCondition).caption || '',
                actionType,
                id
            ]
        );
        const existingRule = existingRulesTuples.find(
            ([cap, action]) => cap === caption && action === actionType
        );
        return existingRule?.[2] || `{${uuid()}}`;
    };

    static createRule = (
        { actionParams, eventCondition, ...rule }: RawRule,
        existingRules: EventRule[]
    ): EventRule => ({
        id: NxSystem.getRuleId(eventCondition.caption, rule.actionType, existingRules),
        ...NxSystem.baseRule,
        ...rule,
        actionParams: JSON.stringify(actionParams),
        eventCondition: JSON.stringify(eventCondition)
    });

    /**
     * Methods and properties below need to be refactored and moved to respective manager classes.
     *
     * TODO: Refactor methods to be able to be used from within manager classes.
     */

    /**
     * TODO: This method needs to be refactored and moved into userManager.
     * @deprecated Not really deprecated yet but should be soon.
     */
    getUsersCachedInCloud(): Promise<NxSystemUser[]> {
        this.isAvailable = false;
        return this.cloudApi.users(this.id).toPromise().then((data: any) => {
            if (data && data.resultCode === 'forbidden') {
                return Promise.reject(data);
            }
            data.forEach(user => {
                user.isCloud = true;
                user.permissions = this.userManager.normalizePermissionString(user.customPermissions);
                user.email = user.accountEmail;
            });
            return data;
        }).catch(err => err);
    }

    /**
     * TODO: This method needs to be refactored and moved into userManager.
     * @deprecated Not really deprecated yet but should be soon.
     */
    getUsers(reload?: boolean, suppressUpdate = false): Promise<void> {
        if (!this.usersPromise || reload) {
            let usersPromise: Promise<any>;
            if (this.isOnline) { // Two separate cases - either we get info from the system (presuming it has actual names)
                usersPromise = this.userManager.getUsersDataFromTheSystem().then(() => {
                    this.isAvailable = true;
                }).catch(() => {
                    if (!environment.isLocal && this.isAdmin) {
                        return this.getUsersCachedInCloud().then(users => {
                            this.userManager.processUsers(users);
                            return Promise.resolve();
                        });
                    } else {
                        return Promise.resolve();
                    }
                });
            } else if (!environment.isLocal && this.isAdmin) { // or we get old cached data from the cloud
                usersPromise = this.getUsersCachedInCloud().then(users => {
                    return this.userManager.processUsers(users);
                });
            } else {
                this.isAvailable = false;
                usersPromise = Promise.resolve();
            }

            this.usersPromise = usersPromise.then(() => {
                this.userManager.checkPermissions();
                // If system is reported to be online - try to get actual users list
                if (!suppressUpdate) {
                    this.systemInfo = this;
                }
            }); // Handling promise to satisfy the linter.
        }
        return this.usersPromise;
    }

    /**
     * TODO: This should be refactored to be moved into cameraManager
     * @deprecated Not really deprecated yet but should be soon.
     */
    filterCamerasFromUserPermissions(): void {
        const accessRights: { [resourceId: string]: true; } = this.userManager.currentUser?.accessRights;
        if (accessRights && this.cameraManager.cameras) {
            this.cameraManager.cameras = this.cameraManager.cameras.filter(camera => accessRights[camera.id]);
        }
    }

    /**
     * Methods and properties below are deprecated.
     *
     * They should instead be accessed from their respective manager classes.
     *
     * New code should reference from manager classes.
     *
     * TODO: Refactor old code and remove deprecated methods.
     */

    // Start of deprecated userManger methods

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    getUsersDataFromTheSystem() {
        return this.userManager.getUsersDataFromTheSystem();
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    saveUser(user: NxSystemUser, role: NxSystemRole) {
        return this.userManager.saveUser(user, role);
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    deleteUser(removedUser: NxSystemUser) {
        return this.userManager.deleteUser(removedUser);
    }

    deleteFromCurrentAccount(password?: string) {
        const currentUser = this.userManager.currentUser;
        const email = currentUser ? currentUser.email : this.userManager.currentUserEmail;
        if (this.isAvailable && currentUser) {
            // Try to remove me from the system directly
            this.userManager.deleteUser(currentUser);
        }
        // Anyway - send another request to cloud_db to remove my this
        const id = environment.isLocal ? this.CONFIG.cloudSystemId : this.id;
        return this.cloudApi.unshare(id, email, password);
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    get accessRole() {
        return this.userManager.accessRole || '';
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    get accessRoles() {
        return this.userManager.accessRoles;
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    get currentUser() {
        return this.userManager.currentUser;
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     * Note: userManager.isAdmin() is a function with one required argument, not a getter
     */
    get isAdmin() {
        return this.userManager.permissions.isAdmin;
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     * Note: userManager.isOwner() is a function with one required argument, not a getter
     */
    get isOwner() {
        return this.userManager.isOwner(this.userManager.currentUser);
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    get isMine() {
        return this.userManager.isMine;
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
     */
    get users() {
        return this.userManager.users;
    }

    // Start of deprecated cameraManager methods

    /**
     * @deprecated Property should be refrenced from cameraManager instead of directly for system.
     */
    get cameras() {
        return this.cameraManager.cameras;
    }

    set cameras(newCameras: ICamera[]) {
        this.cameraManager.cameras = newCameras;
    }

    /**
     * @deprecated Method should be refrenced from cameraManager instead of directly from system.
     */
    updateRecordingSettings(updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false, cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'>) {
        return this.cameraManager.updateRecordingSettings(updatedTask, cameraSettings);
    }

    /**
     * @deprecated Method should be refrenced from cameraManager instead of directly from system.
     */
    getCameras() {
        return this.cameraManager.getCameras();
    }

    /**
     * @deprecated Method should be refrenced from cameraManager instead of directly from system.
     */
    updateSystemServersCameras() {
        return this.cameraManager.updateSystemServersCameras();
    }

    // Start of deprecated serverManager methods

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    getPreviewUrl(cameraId: string, time: number, width = 640, height = 480, rotate = 0) {
        return this.serverManager.getPreviewUrl(cameraId, time, width, height, rotate);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    renameServer(serverId: string, serverName: string) {
        return this.serverManager.renameServer(serverId, serverName)
            .then(() => this.update())
            .catch(err => Promise.reject(err));
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    restartServer(serverId: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.restartServer(serverId)
            .catch(err => {
                this.currentServerNotBusy = true;
                return Promise.reject(err);
            });
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     * TODO: Need to update this method once better license information is available from server with details on license types.
     */
    getLicenseChannels(): Promise<{ total: number; used: number; available: number; }> {
        return this.serverManager.getLicenseChannels(this.cameraManager.cameras);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    get servers() {
        return this.serverManager.servers;
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    get moduleInfo() {
        return this.serverManager.moduleInfo;
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    getServerApiDoc() {
        return this.serverManager
            .getApiDoc()
            .catch(err => Promise.reject(err));
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    activateLicense(serverId, key) {
        return this.serverManager.activateLicense(serverId, key);
    }
}
