import {
    BehaviorSubject, of, Subscription,
    Observable, from, Subject
}                               from 'rxjs';
import { flatMap, takeUntil }   from 'rxjs/operators';

import { ServerManager }    from './server-manager/server-manager';
import { UserManager }      from './user-manager/user-manager';
import { CameraManager }    from './camera-manager/camera-manager';
import { StorageManager }   from './storage-manager/storage-manager';

import { IConfig }                                  from '../../nx-config';
import { NxCloudApiService }                        from '../../nx-cloud-api';
import { NxSystemsService, NxSystemWithUserInfo }   from '../../systems.service';
import { NxSystemAPIService, NxSystemAPI }          from '../../system-api.service';
import { NxPollService }                            from '../../poll.service';
import { NxAppStateService }                        from '../../nx-app-state.service';
import { SystemConfigSettings }                     from '../../system-api.types';
import { LanguageI18NStaticTypes }                  from '@app/language_i18n_static_types';
import { trimIDs as trimIds }                       from '../../../utils/api_response_cleaners';
import { NxRibbonService }                          from '@components/ribbon';
import { NxSystemRestAPI }                          from '@services/system-rest-api.service';
import {
    System, IParams, ServerTimeInfo, ICamera,
    ITask, NxSystemUser, NxSystemRole
}                                                   from './system-types';

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
export class NxSystem extends System {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    userManager: UserManager;
    serverManager: ServerManager;
    cameraManager: CameraManager;
    storageManager: StorageManager

    private _subscribersCount = new BehaviorSubject<number>(0);

    activeSubscription: Subscription;
    show404 = false;
    currentUserEmail: string;
    mediaserver: NxSystemAPI | NxSystemRestAPI;
    currentServerNotBusy: boolean;
    currentBusyServerIds = new Set();

    /** Used for determining whether to use NxSystemAPI or NxSystemRestAPI */
    #apiVersion = 0;

    infoPromise: Promise<Partial<NxSystemWithUserInfo>>;
    usersPromise: Promise<void>;
    systemPoll: Subscription | Observable<string | NxSystem>;
    licensesModifiedSubject = new BehaviorSubject<string>('');
    connectionSubject = new BehaviorSubject<boolean>(false);
    infoSubject = new BehaviorSubject<NxSystem>(undefined);

    /** The #apiVersion private property is used for determining whether to instantiate NxSystemAPI or NxSystemRestAPI  */
    setApiVersion(version: string | number) {
        this.#apiVersion = typeof version === 'string' ? parseFloat(version) : version;
    }

    get useRest() {
        return this.#apiVersion >= NxSystemRestAPI.supportedVersion;
    }

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
        },
        this.useRest);
        // Handling promise to satisfy the linter.
        this.updateSystemAuth(true).then(() => {
        });

        this.userManager = new UserManager(this.CONFIG, this.LANG, this.mediaserver, currentUserEmail, userId);
        this.systemPoll = this.pollService.createPoll<any>(this.update, this.CONFIG.updateInterval).pipe(
            takeUntil(this.cancelPoll$)
        );
        this.serverManager = new ServerManager(
            this.mediaserver,
            this.systemApiService,
            this.currentUserEmail,
            this.id,
            this.cloudApi,
            this
        );

        this.cameraManager = new CameraManager(
            this.serverManager
        );

        this.storageManager = new StorageManager(this);
    }

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
        // system's capability check was removed as health info page handles it by showing "outdated version" placeholder
        return this.CONFIG.accessRoles.adminAccess.includes(this.accessRole.toLowerCase());
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
                    if (this.CONFIG.isLocal && !this.info.name) {
                        this.info.name = this.CONFIG.system.name;
                    }
                    this.id = parsedSettings?.id || this.CONFIG.localSystemId;
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
            }).catch(_ => {
                return Promise.reject();
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
                .then(() => this.isOnline ? this.cameraManager.updateSystemServersCameras() : Promise.reject())
                .then(() => this.getUsers(true))
                .then(() => this.serverManager.getForceServers(false).toPromise())
                .then(() => this.cameraManager.getCameras())
                .then(() => from(this.getUsers(true)))
                .then(() => this.filterCamerasFromUserPermissions())
                .catch((error) => {
                    this.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert', undefined, true);
                    this.isAvailable = false;
                    this.lostConnection = error?.data && error.data.resultCode === 'forbidden';
                });
        })).toPromise();
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

    mergeSystems(url: string, dryRun: string, currentPassword?: string) {
        return this.mediaserver.mergeSystems(url, dryRun, currentPassword);
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

    authPromise: Promise<any>;

    ensureSystemAuth(force?) {

        if (this.CONFIG.isLocal) {
            return Promise.resolve();
        }

        if (this.authPromise) {
            return this.authPromise;
        }

        if (!force && this.mediaserver.authGet) {
            return Promise.resolve(true);
        }

        this.authPromise = this.cloudApi.getSystemAuth(this.id).toPromise().then(
            (authKeys: any) => {
                if (authKeys.authGet) {
                    this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                    this.authPromise = null;
                    return Promise.resolve(true);
                } else {
                    this.authPromise = null;
                    return Promise.reject(authKeys);
                }
            }
        );

        return this.authPromise;
    }

    public getResourceTypes(force: boolean = false) {

        if (this.resourceTypes && !force) {
            return Promise.resolve(this.resourceTypes);
        }

        return this.ensureSystemAuth().then(
            () => this.mediaserver.getResourceTypes().toPromise()
        ).then(resourceTypes => {
            this.resourceTypes = resourceTypes;
            return this.resourceTypes;
        });
    }

    public getMediaServersAndCameras(force: boolean = false): any {

        if (this.mediaservers && !force) {
            return Promise.resolve(this.mediaservers);
        }

        return this.ensureSystemAuth().then(
            () => this.mediaserver.getMediaServersAndCameras().toPromise()
        ).then(
            // @ts-ignore
            response => {
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
                return [];
            }
        );
    }

    protected _setMediaServersAndCameras(apiReply) {
        // `mss` stands for mediaservers, `cs` — for cameras

        // sometimes the server sends weird keys (@gbezyuk)
        const mss = apiReply['ec2/getMediaServersEx'] ||
            apiReply['/ec2/getMediaServersEx'];

        let cs = apiReply['ec2/getCamerasEx'];

        return this.getResourceTypes().then(resourceTypes => {

            const desktopCameraType = resourceTypes.find(t => t.name === 'SERVER_DESKTOP_CAMERA');

            cs = cs.filter(
                c => c.typeId !== desktopCameraType.id &&
                    !c.addParams.find(p => p.name === 'ioConfigCapability')
            ).map(trimIds);

            this.mediaservers = mss.map(trimIds).map(ms => ({
                ...ms,
                cameras: cs.filter(c => c.parentId === ms.id)
            }));

            return this.mediaservers;
        });
    }

    public checkCameraThumbnail (cameraId) {
        return this.ensureSystemAuth().then(
            () => this.mediaserver.checkCameraThumbnail(cameraId)
        );
    }

    public getCameraThumbnailUrl (cameraId, width = 128, height = 128, t?) {
        return this.mediaserver.getCameraThumbnailUrl(cameraId, width, height, t);
    }

    public getPlaybackUrl (cameraId, transport, resolution, position) {
        return this.mediaserver.getPlaybackUrl(cameraId, transport, resolution, position)
    }

    public getCameraRecords(cameraId, startTime?, endTime?, detail?, limit?, label?, periodsType?) {
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
                        vmsTime        : parseInt(i.vmsTime),
                        vmsTimeOffset  : now - parseInt(i.vmsTime),
                        osTimeOffset   : now - parseInt(i.osTime),
                        serverId       : i.serverId.slice(1, i.serverId.length - 1),
                        timeZoneOffset : parseInt(i.timeZoneOffset)
                    }));
                }
            )
        );
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

    /**
     * TODO: This method needs to be refactored and moved into userManager.
     * @deprecated Not really deprecated yet but should be soon.
     */
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

    /**
     * TODO: This should be refactored to be moved into cameraManager
     * @deprecated Not really deprecated yet but should be soon.
     */
    filterCamerasFromUserPermissions() {
        const accessRights: { [resourceId: string]: true; } = this.userManager.currentUser?.accessRights;
        if (accessRights && this.cameraManager.cameras) {
            this.cameraManager.cameras = this.cameraManager.cameras.filter(camera => accessRights[camera.id]);
        }
    }

    /**
     * TODO: Refactor to allow for accessing straight from serverManager
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    updateOrGetSystemStorage<T extends any>(updateParams?: any, useCache = false, customTimeout = 8000) {
        if (!updateParams?.serverId) {
            return this.mediaserver.updateStorages(updateParams, customTimeout);
        }
        return this.serverManager.getStorages(updateParams.serverId, useCache, customTimeout);
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
            const delPromise = this.userManager.deleteUser(currentUser);
        }
        // Anyway - send another request to cloud_db to remove my this
        const id = this.CONFIG.isLocal ? this.CONFIG.cloudSystemId : this.id;
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
     */
    get isAdmin() {
        return this.userManager.permissions.isAdmin;
    }

    /**
     * @deprecated Method should be refrenced from userManager instead of directly from system.
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

    updateResource(id: string, params: IParams) {
        return this.serverManager.updateResource(id, params);
    }

    setCameraUserSettings(serverId: string, id: string, params: { [key: string]: string; }) {
        return this.serverManager.setCameraUserSettings(serverId, id, params);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    setServerUserSettings(id: string, params: { [key: string]: string; }) {
        return this.serverManager.setServerUserSettings(id, params);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    getServers() {
        return this.serverManager.getServers();
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    getForceServers() {
        return this.serverManager.getForceServers(false);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    getModuleInfo(serverId?: string) {
        return this.serverManager.getModuleInfo(serverId);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    changeServerPort(port: number, serverId: string) {
        return this.serverManager.changeServerPort(port, serverId);
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
            .catch(err => Promise.reject(err));
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    detachFromSystem(serverId: string, currentPassword: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.detachFromSystem(serverId, currentPassword);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    removeMediaserver(anotherServerId: string, currentServerId: string) {
        return this.serverManager.removeMediaserver(anotherServerId, currentServerId);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    restoreFactorySettings(serverId: string, currentPassword: string) {
        this.currentServerNotBusy = false;
        return this.serverManager.restoreFactorySettings(serverId, currentPassword);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     * TODO: Need to update this method once better license information is available from server with details on license types.
     */
    getLicenseChannels(): Promise<{ total: number; used: number; available: number; }> {
        return this.serverManager.getLicenses().then(({ licenses, hwids }: any) => {
            const parsedLicenses = licenses.map(this.serverManager.parseLicense);
            const total: number = parsedLicenses.reduce((qty, { COUNT, EXPIRATION, CLASS, HWID }) => {
                const activeLicense = hwids.includes(HWID) && !EXPIRATION || new Date(EXPIRATION).getTime() > Date.now();
                return activeLicense && (CLASS === 'digital' || CLASS === 'starter' || CLASS === 'edge') ? qty + parseInt(COUNT) : qty;
            }, 0);
            const used = this.cameras.filter(({ scheduleEnabled }) => scheduleEnabled).length;
            const available = total - used;
            return { total, used, available };
        });
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    // @ts-ignore
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
    getServerApiDoc(serverId: string) {
        return this.serverManager
            .getApiDoc(serverId).toPromise()
            .catch(err => Promise.reject(err));
    };

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    logLevel(serverId: string) {
        return this.serverManager.logLevel(serverId);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    setLogLevels(serverId: string, loggers: IParams) {
        return this.serverManager.setLogLevels(serverId, loggers);
    }

    /**
     * @deprecated Method should be refrenced from serverManager instead of directly from system.
     */
    activateLicense(serverId, key) {
        return this.serverManager.activateLicense(serverId, key);
    }
}
