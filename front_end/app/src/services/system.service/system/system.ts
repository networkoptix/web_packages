import {
    BehaviorSubject, of, Subscription,
    Observable, from, Subject
}                               from 'rxjs';
import { flatMap, takeUntil, tap }   from 'rxjs/operators';

import { IConfig }                                  from '../../nx-config';
import { NxCloudApiService }                        from '../../nx-cloud-api';
import { NxSystemsService, NxSystemWithUserInfo }   from '../../systems.service';
import { NxSystemAPIService, NxSystemAPI }          from '../../system-api.service';
import { NxPollService }                            from '../../poll.service';
import { NxAppStateService }                        from '../../nx-app-state.service';
import { SystemConfigSettings }                     from '../../system-api.types';
import { LanguageI18NStaticTypes }                  from '@app/language_i18n_static_types';
import { trim_ids as trimIds }                      from '../../../utils/api_response_cleaners';
import { NxRibbonService }                          from '@components/ribbon';
import { ServerManager }                            from './server-manager/server-manager';
import { UserManager }                              from './user-manager/user-manager';
import {
    System, IParams, ServerTimeInfo, ICamera,
    ITask, NxSystemUser, NxSystemRole
}                                                   from './system-types';
export class NxSystem extends System {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private userManager: UserManager;
    private serverManager: ServerManager;
    private _subscribersCount = new BehaviorSubject<number>(0);

    activeSubscription: Subscription;
    show404 = false;
    currentUserEmail: string;
    mediaserver: NxSystemAPI;
    currentServerNotBusy: boolean;
    currentBusyServerIds = new Set();

    infoPromise: Promise<Partial<NxSystemWithUserInfo>>;
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

    // Start of userManger functions
    get accessRole() {
        return this.userManager.accessRole || '';
    }

    get accessRoles() {
        return this.userManager.accessRoles;
    }

    get currentUser() {
        return this.userManager.currentUser;
    }

    get isAdmin() {
        return this.userManager.permissions.isAdmin;
    }

    get isOwner() {
        return this.userManager.isOwner(this.userManager.currentUser);
    }

    get isMine() {
        return this.userManager.isMine;
    }

    get permissions() {
        return this.userManager.permissions;
    }

    get users() {
        return this.userManager.users;
    }

    get cameras() {
        return this.serverManager.cameras;
    }

    set cameras(newCameras: ICamera[]) {
        this.serverManager.cameras = newCameras;
    }

    /**
     * TODO: Need to update this method once better license information is available from server with details on license types.
     */
    getLicenseChannels(): Promise<{ total: number; used: number; available: number; }> {
        return this.serverManager.getLicenses().then(({ licenses, hwids }: any) => {
            const parsedLicenses = licenses.map(this.parseLicense);
            const total: number = parsedLicenses.reduce((qty, { COUNT, EXPIRATION, CLASS, HWID }) => {
                const activeLicense = hwids.includes(HWID) && !EXPIRATION || new Date(EXPIRATION).getTime() > Date.now();
                return activeLicense && (CLASS === 'digital' || CLASS === 'starter' || CLASS === 'edge') ? qty + parseInt(COUNT) : qty;
            }, 0);
            const used = this.cameras.filter(({ scheduleEnabled }) => scheduleEnabled).length;
            const available = total - used;
            return { total, used, available };
        });
    }

    parseLicense({ key, licenseBlock }: { key: string; licenseBlock: string; }) {
        const parsedBlock: any = licenseBlock.split('\n').reduce((parsed, current) => {
            const [curKey, curVal] = current.split('=');
            return { ...parsed, [curKey]: curVal };
        }, {});
        return { key, ...parsedBlock };
    }

    // End of userManager get functions
    // Start of serverManager functions
    // @ts-ignore
    get servers() {
        return this.serverManager.servers;
    }

    get moduleInfo() {
        return this.serverManager.moduleInfo;
    }

    // End of serverManager functions
    constructor(
        CONFIG: IConfig,
        LANG: LanguageI18NStaticTypes,
        private cancelPoll$: Subject<string>,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private ribbonService: NxRibbonService,
        currentUserEmail: string,
        systemId?: string,
        serverId?: string,
        userId?: string,
        private appState?: NxAppStateService
    ) {
        super();

        this.CONFIG = CONFIG;
        this.LANG = LANG;
        this.lostConnection = false;
        this.initSystem(currentUserEmail, systemId, serverId, userId);
    }

    private updateSystemState() {
        this.stateMessage = '';
        if (!this.isAvailable) {
            this.stateMessage = this.LANG.system.status.unavailable?.();
        }
        if (!this.isOnline) {
            this.stateMessage = this.LANG.system.status.offline?.();
        }
    }

    initSystem(currentUserEmail: string, systemId?: string, serverId?: string, userId?: string) {
        this.id = systemId || serverId;
        this.isAvailable = false;
        this.isOnline = false;
        this.currentServerNotBusy = true;
        this.info = { name: '' };
        this.mergeInfo = {};
        this.cloudStorageSystemEnabled = false;

        this.currentUserEmail = currentUserEmail;
        this.mediaserver = this.systemApiService.createConnection(currentUserEmail, systemId, serverId, () => {
            /* Unauthorised request handler
             Some options here:
             - Access was revoked
             - System was disconnected from cloud\Password was changed
             - Nonce expired
             We try to update nonce and auth on the server again
             Other cases are not distinguishable
             */
            return this.updateSystemAuth(true);
        });
        // Handling promise to satisfy the linter.
        this.updateSystemAuth(true).then(() => {
        });

        this.userManager = new UserManager(this.CONFIG, this.LANG, this.mediaserver, currentUserEmail, userId);
        this.systemPoll = this.pollService.createPoll<any>(this.update, this.CONFIG.updateInterval).pipe(
            takeUntil(this.cancelPoll$.pipe(tap(() => console.info(`cancel polling on system ${this.systemInfo.id}`))))
        );
        this.serverManager = new ServerManager(
            this.mediaserver,
            this.systemApiService,
            this.currentUserEmail,
            this.id,
            this.cloudApi
        );
    }

    getServerApiDoc(serverId: string) {
        return this.serverManager
            .getApiDoc(serverId).toPromise()
            .catch(err => Promise.reject(err));
    };

    updateSystemAuth(force?: boolean) {
        if (this.CONFIG.isLocal || !force && this.mediaserver.authGet) { // no need to update
            return Promise.resolve(true);
        }

        return this.cloudApi.getSystemAuth(this.id).toPromise().then((authKeys: any) => {
            this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
            return Promise.resolve(true);
        }).catch(() => {
            this.lostConnection = true;
        });
    }

    canViewInfo() {
        return (this.info.capabilities &&
            this.info.capabilities.vms_metrics) &&
            this.CONFIG.accessRoles.adminAccess.includes(this.accessRole.toLowerCase());
    }

    canUserViewCloudStorage() {
        if (this.CONFIG.isLocal) {
            return false;
        }
        return (this.CONFIG.cloudCapabilities.cloudStorageEnabled && this.isMine) ||
            (this.isAdmin && this.systemInfo.cloudStorageSystemEnabled) ||
            (this.systemInfo.cloudStorageCapable && this.isMine);
    }

    getInfoAndPermissions(useCache = true, suppressUpdate = false) {
        const parseSettings = ({
            cloudAccountName: ownerAccountEmail,
            systemName,
            specificFeatures,
            mergeInfo
        }: SystemConfigSettings) => {
            return {
                ownerAccountEmail,
                systemName,
                mergeInfo,
                capabilities : JSON.parse(<any>specificFeatures),
                isOnline     : true
            };
        };

        if (this.CONFIG.isLocal) {
            return this.mediaserver.getSystemSettings()
                .then(res => {
                    const parsedSettings = parseSettings(res);
                    Object.assign(parsedSettings, this.userManager.currentUser);
                    if (this.info) {
                        Object.assign(this.info, parsedSettings); // Update
                    } else {
                        this.info = parsedSettings;
                    }
                    this.id = res.localSystemId;
                    this.mergeInfo = this.info.mergeInfo;
                    this.isOnline = true;
                    this.cloudStorageCapable = false;

                    this.getUsers(true)
                        .then(() => {
                            this.userManager.ownerEmail = this.info.ownerAccountEmail;
                            this.userManager.accessRole = this.info.accessRole;
                            this.userManager.checkPermissions();
                        });
                })
                .catch(err => console.error('getInfoAndPermissions: ', err))
                .finally(() => {
                    return Promise.resolve(this as Partial<NxSystemWithUserInfo>);
                });
        }

        return this.systemsService
            .getSystemAsPromise(this.id, useCache)
            .then(async(response: any) => {
                const error = this.cloudApi.checkResponseHasError(response);
                if (error) {
                    return Promise.reject(error);
                }

                if (!response) {
                    // eslint-disable-next-line prefer-promise-reject-errors
                    return Promise.reject({ data: { resultCode: 'forbidden' } });
                }
                if (this.info) {
                    Object.assign(this.info, response); // Update
                } else {
                    this.info = response;
                }
                this.userManager.ownerEmail = this.info.ownerAccountEmail;
                this.isOnline = this.info.stateOfHealth === this.CONFIG.system.status.online;
                this.canMerge = this.userManager.isMine && (this.info.capabilities && this.info.capabilities.cloudMerge);
                this.cloudStorageCapable = this.info.capabilities && !!this.info.capabilities.cloudStorage;
                if (this.cloudStorageCapable) {
                    this.cloudStorageSystemEnabled = await this.cloudApi.getCloudStorageUsage(this.info.id).then(() => true, () => false);
                }
                this.mergeInfo = response.mergeInfo;

                if (!suppressUpdate) {
                    this.systemInfo = this;
                }
                if (!this.userManager.accessRole) {
                    this.userManager.accessRole = this.info.accessRole;
                }
                return Promise.resolve(this as Partial<NxSystemWithUserInfo>);
            });
    }

    getInfo(force?, useCache = true, suppressUpdate = false): Promise<Partial<NxSystemWithUserInfo | any>> {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = this.updateSystemAuth().then(() => {
                return this.getInfoAndPermissions(useCache, suppressUpdate).then((res) => {
                    return res;
                });
            });
        }
        return this.infoPromise;
    }

    getUsersCachedInCloud(): Promise<NxSystemUser[]> {
        this.isAvailable = false;
        return this.cloudApi.users(this.id).toPromise().then((data: any) => {
            if (data && data.resultCode === 'forbidden') {
                return Promise.reject(data);
            }
            data.forEach((user) => {
                user.isCloud = true;
                user.permissions = this.userManager.normalizePermissionString(user.customPermissions);
                user.email = user.accountEmail;
            });
            return data;
        }).catch(err => err);
    }

    getUsersDataFromTheSystem() {
        return this.userManager.getUsersDataFromTheSystem();
    }

    getUsers(reload?): Promise<void> {
        if (!this.usersPromise || reload) {
            let usersPromise: Promise<any>;
            if (this.isOnline) { // Two separate cases - either we get info from the system (presuming it has actual names)
                usersPromise = this.userManager.getUsersDataFromTheSystem().then(() => {
                    this.isAvailable = true;
                }).catch(() => {
                    if (this.isAdmin) {
                        return this.getUsersCachedInCloud().then((users) => {
                            this.userManager.processUsers(users);
                            return Promise.resolve();
                        });
                    } else {
                        return Promise.resolve();
                    }
                });
            } else if (this.isAdmin) { // or we get old cached data from the cloud
                usersPromise = this.getUsersCachedInCloud().then((users) => {
                    return this.userManager.processUsers(users);
                });
            } else {
                this.isAvailable = false;
                usersPromise = Promise.resolve();
            }

            this.usersPromise = usersPromise.then(() => {
                this.userManager.checkPermissions();
                // If system is reported to be online - try to get actual users list
                this.systemInfo = this;
            }); // Handling promise to satisfy the linter.
        }
        return this.usersPromise;
    }

    saveUser(user: NxSystemUser, role: NxSystemRole) {
        return this.userManager.saveUser(user, role);
    }

    deleteUser(removedUser: NxSystemUser) {
        return this.userManager.deleteUser(removedUser);
    }

    deleteFromCurrentAccount() {
        if (this.isAvailable && this.currentUser && !this.currentUser.isAdmin) {
            // Try to remove me from the system directly
            this.userManager.deleteUser(this.currentUser);
        }
        // Anyway - send another request to cloud_db to remove my this
        return this.cloudApi.unshare(this.id, this.currentUserEmail);
    }

    startPoll() {
        if (this.subscriberCount === 0) {
            if (this.CONFIG.isLocal || this.mediaserver.authGet) {
                this.subscriberCount++;
                this.activeSubscription = this.systemPoll instanceof Observable && this.systemPoll.subscribe(() => { });
            } else {
                setTimeout(() => this.startPoll(), 1000);
            }
        } else {
            this.subscriberCount++;
        }
    }

    stopPoll() {
        if (this.subscriberCount > 1) {
            this.subscriberCount--;
        } else {
            if (this.systemPoll instanceof Subscription) {
                this.systemPoll.unsubscribe();
            }
            if (this.activeSubscription instanceof Subscription) {
                this.activeSubscription.unsubscribe();
            }

            this.infoPromise = undefined;
            this.usersPromise = undefined;
            this.systemInfo = undefined;
            this.subscriberCount--;
        }
    }

    update = (): Promise<any> => {
        this.ribbonService.hide();
        return of('').pipe(flatMap(() => {
            return this.getInfo(true, false)
                .then(() => this.isOnline ? this.updateSystemServersCameras() : Promise.reject())
                .then(() => this.getUsers(true))
                .then(() => this.getServers().toPromise())
                .then(() => this.getCameras())
                .then(() => from(this.getUsers(true)))
                .then(() => this.filterCamerasFromUserPermissions())
                .catch((error) => {
                    this.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert');
                    this.isAvailable = false;
                    this.lostConnection = error?.data && error.data.resultCode === 'forbidden';
                });
        })).toPromise();
    };

    updateSystemServersCameras() {
        return this.serverManager.updateSystemServersCameras();
    }

    filterCamerasFromUserPermissions() {
        const accessRights: { [resourceId: string]: true; } = this.currentUser.accessRights;
        if (accessRights && this.cameras) {
            this.cameras = this.cameras.filter(camera => accessRights[camera.id]);
        }
    }

    updateOrGetSystemSettings(updateParams = {}) {
        return this.mediaserver.updateOrGetSettings(updateParams);
    }

    getStorageStatus(queryParams) {
        return this.mediaserver.getStorageStatus(queryParams);
    }

    saveStorage<T>(updateParams?: T) {
        const typeId = '{f8544a40-880e-9442-b78a-9da6db6862b4}';
        return this.mediaserver.saveStorage({ ...updateParams, typeId });
    }

    removeStorage<T>(updateParams?: T) {
        return this.mediaserver.removeStorage(updateParams);
    }

    getServerStats(serverId, useCache = false) {
        return this.serverManager.getServerStats(serverId, useCache);
    }

    getRecordStats(serverId, useCache = false) {
        return this.serverManager.getRecordStats(serverId, useCache);
    }

    getStorages<T>(queryParams?: T) {
        return this.mediaserver.getStoragesInfo(queryParams);
    }

    updateOrGetSystemStorage<T extends any>(updateParams?: any, useCache = false, customTimeout = 8000) {
        if (!updateParams?.serverId) {
            return this.mediaserver.updateStorages(updateParams, customTimeout);
        }
        return this.serverManager.getStorages(updateParams.serverId, useCache, customTimeout);
    }

    checkForAnalyticsData(serverId: string) {
        return this.serverManager.checkForAnalyticsData(serverId);
    }

    initSystemMediaServers() {
        return this.serverManager.initSystemMediaServers();
    }

    getPreviewUrl(cameraId: string, time: number, width = 640, height = 480, rotate = 0) {
        return this.serverManager.getPreviewUrl(cameraId, time, width, height, rotate);
    }

    getCameras() {
        return this.serverManager.getCameras();
    }

    updateResource(id: string, params: IParams) {
        return this.serverManager.updateResource(id, params);
    }

    setCameraUserSettings(serverId: string, id: string, params: { [key: string]: string; }) {
        return this.serverManager.setCameraUserSettings(serverId, id, params);
    }

    updateRecordingSettings(updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false, cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'>) {
        return this.serverManager.updateRecordingSettings(updatedTask, cameraSettings);
    }

    setServerUserSettings(id: string, params: { [key: string]: string; }) {
        return this.serverManager.setServerUserSettings(id, params);
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.serverManager.updateOrGetBackupControl(serverId, action);
    }

    getServers() {
        return this.serverManager.getServers();
    }

    getForceServers() {
        return this.serverManager.getForceServers(false);
    }

    getModuleInfo(serverId?: string) {
        return this.serverManager.getModuleInfo(serverId);
    }

    changeServerPort(port: number, serverId: string) {
        return this.serverManager.changeServerPort(port, serverId);
    }

    renameServer(serverId: string, serverName: string) {
        return this.serverManager.renameServer(serverId, serverName)
            .then(() => this.update())
            .catch(err => Promise.reject(err));
    }

    restartServer(serverId: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.restartServer(serverId)
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.detachFromSystem(serverId, currentPassword);
    }

    removeMediaserver(anotherServerId: string, currentServerId: string) {
        return this.serverManager.removeMediaserver(anotherServerId, currentServerId);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.restoreFactorySettings(serverId, currentPassword);
    }

    mergeSystems(url: string, dryRun: string, currentPassword?: string) {
        return this.mediaserver.mergeSystems(url, dryRun, currentPassword);
    }

    checkMergeStatus(forceReload = true) {
        return this.mediaserver.checkMergeStatus(forceReload);
    }

    getPeerSystems() {
        return this.mediaserver.getPeerSystems();
    }

    logLevel(serverId: string) {
        return this.serverManager.logLevel(serverId);
    }

    setLogLevels(serverId: string, loggers: IParams) {
        return this.serverManager.setLogLevels(serverId, loggers);
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

    activateLicense(serverId, key) {
        return this.serverManager.activateLicense(serverId, key);
    }

    // <added by @gbezyuk to fix auth race condition>
    authPromise: Promise<any>;
    // </added by @gbezyuk to fix auth race condition>
    // <changed by @gbezyuk to fix auth race condition>
    ensureSystemAuth(force?) {
        if (this.CONFIG.isLocal) { return Promise.resolve(); }

        // console.log('ensureSystemAuth', this.id)
        if (this.authPromise) {
            // console.log('in progress')
            return this.authPromise;
        }

        // NOTE@gbezyuk: bad direct dependency
        if (!force && this.mediaserver.authGet) { // no need to update
            // console.log('no need', this.mediaserver.authGet)
            return Promise.resolve(true);
        }

        this.authPromise = this.cloudApi.getSystemAuth(this.id).toPromise().then((authKeys: any) => {
            if (authKeys.authGet) {
                this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                // console.log('new ones are good')
                this.authPromise = null;
                return Promise.resolve(true);
            } else {
                // console.error('bad system auth response', authKeys)
                this.authPromise = null;
                return Promise.reject(authKeys);
            }
        });
        return this.authPromise;
    }

    // </changed by @gbezyuk to fix auth race condition>
    // <added by @gbezyuk for watch component>
    public getResourceTypes(force: boolean = false) {
        // console.log('getting resource types')
        if (this.resourceTypes && !force) {
            // console.log('there are resource types in cache')
            return Promise.resolve(this.resourceTypes);
        }
        // TODO: cache invalidation (@gbezyuk)
        // console.log('resource type cache is empty, sending a query')
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getResourceTypes().toPromise()
        ).then(resourceTypes => {
            this.resourceTypes = resourceTypes;
            return this.resourceTypes;
        });
    }

    public getMediaServersAndCameras(force: boolean = false) {
        // console.log('getMediaServersAndCameras enter')
        if (this.mediaservers && !force) {
            // console.log('using cached mediaservers');
            return Promise.resolve(this.mediaservers);
        }

        // return this.mediaserver.getMediaServersAndCameras().toPromise().then( // simpler version, for debug
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getMediaServersAndCameras().toPromise()
        ).then(

            // @ts-ignore
            response => {
                // console.log('GMSAC', response)
                // CURSING@gbezyuk: error code as a string in JSON, guys, really?
                // @ts-ignore
                if ((response.error && response.error !== '0') || !response.reply) {
                    console.error('error getting mediaservers and cameras');
                    return response;
                }
                // @ts-ignore
                return this._setMediaServersAndCameras(response.reply);
            }
        ).catch(
            response => {
                console.error('getMediaServersAndCameras failure', response);
            }
        );
        // TODO: better error handling
    }

    protected _setMediaServersAndCameras(apiReply) {
        // `mss` stands for mediaservers, `cs` — for cameras
        const mss = apiReply['ec2/getMediaServersEx'] || apiReply['/ec2/getMediaServersEx']; // sometimes the server sends weird keys (@gbezyuk)
        let cs = apiReply['ec2/getCamerasEx'];

        return this.getResourceTypes().then(resourceTypes => {
            // console.log('filtering, resource types that we got are', resourceTypes)
            const desktopCameraType = resourceTypes.find(t => t.name === 'SERVER_DESKTOP_CAMERA');

            console.log('desktop_camera_type', desktopCameraType);

            cs = cs.filter(
                c => c.typeId !== desktopCameraType.id &&
                    !c.addParams.find(p => p.name === 'ioConfigCapability')
            ).map(trimIds);
            // TODO: map camera data preprocessing here
            // (strip IDs, parse JSON, provide (and maybe check) URLs, etc.)
            console.log('cameras filtered', cs);

            // TODO: preprocess servers, too
            // (strip IDs, parse JSON, etc.)
            this.mediaservers = mss.map(trimIds).map(ms => ({
                ...ms,
                // keeping cameras inside/under the mediaserver they belong to
                // cameras: cs.filter(c => c.preferredServerId === ms.id)
                cameras: cs.filter(c => c.parentId === ms.id)
            }));
            console.log('mediaservers filtered', this.mediaservers);
            return this.mediaservers;
        });
    }

    public checkCameraThumbnail(cameraId) {
        // TODO: maybe check if this camera_id belongs to us (@gbezyuk)
        return this.ensureSystemAuth().then(
            () => this.mediaserver.checkCameraThumbnail(cameraId)
        );
    }

    public getCameraThumbnailUrl(cameraId, width = 68, height = 38) {
        return this.mediaserver.getCameraThumbnailUrl(cameraId, width, height);
    }

    public getCameraLiveHlsUrl(cameraId) {
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getLiveHlsUrl(cameraId)
        );
    }

    public getHlsUrl(cameraId, position?, resolution = 'hi') {
        return this.ensureSystemAuth().then(
            () => position === -1
                ? this.mediaserver.getLiveHlsUrl(cameraId, resolution)
                : this.mediaserver.getHlsUrl(cameraId, position, resolution)
        );
    }

    public unsafeGetCameraLiveHlsUrl(cameraId, resolution = 'hi') {
        return this.mediaserver.getLiveHlsUrl(cameraId, resolution);
    }

    public unsafeGetHlsUrl(cameraId, position?, resolution = 'hi') {
        return position === -1
            ? this.mediaserver.getLiveHlsUrl(cameraId, resolution)
            : this.mediaserver.getHlsUrl(cameraId, position, resolution);
    }

    public getCameraRecords(cameraId, startTime?, endTime?, detail?, limit?, label?, periodsType?) {
        // TODO: maybe check if this camera_id belongs to us (@gbezyuk)
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getRecords(
                cameraId, startTime, endTime, detail, limit, label, periodsType
            ).toPromise()
        );
    }

    public getServerTimes(): Promise<Array<ServerTimeInfo>> {
        return this.ensureSystemAuth().then(
            () => this.mediaserver.getServerTimes().toPromise().then(
                r => {
                    const now = Date.now();
                    // @ts-ignore
                    return r.reply.map(i => ({
                        vmsTimeOffset  : now - parseInt(i.vmsTime),
                        osTimeOffset   : now - parseInt(i.osTime),
                        serverId       : i.serverId.slice(1, i.serverId.length - 1),
                        timeZoneOffset : parseInt(i.timeZoneOffset)
                    }));
                }
            )
        );
    }

    // </added by @gbezyuk for watch component>
    /**
     * Storage server endpoints
     */
    rebuildArchive(serverId: string, type: number, action?: string) {
        return this.serverManager.rebuildArchive(serverId, type, action);
    }
}
