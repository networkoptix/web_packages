import { NxConfigService, IConfig }        from './nx-config';
import { NxLanguageProviderService }       from './nx-language-provider';
import { NxCloudApiService }               from './nx-cloud-api';
import { NxSystemsService }                from './systems.service';
import { Injectable, OnDestroy }           from '@angular/core';
import { NxSystemAPIService, NxSystemAPI } from './system-api.service';
import { BehaviorSubject, from, of }       from 'rxjs';
import { flatMap, tap }                    from 'rxjs/operators';
import { NxPollService }                   from './poll.service';
import { NxUtilsService }                  from './utils.service';
import { PredefinedRole }                  from './nx-config/base-config';
import { LanguageI18NStaticTypes }         from '../../language_i18n_static_types';

export interface NxSystemRole extends PredefinedRole {
    id?: string;
    isAdmin?: boolean;
    label?: string;
}

export interface NxSystemUser {
    accessRole: string;
    canBeDeleted: boolean;
    canBeEdited: boolean;
    cryptSha512Hash: string;
    digest: string;
    email: string;
    fullName: string;
    hash: string;
    id: string;
    isAdmin: boolean;
    isCloud: boolean;
    isEnabled: boolean;
    isLdap: boolean;
    isLocalAdmin: boolean;
    isMe: boolean;
    name: string;
    parentId: string;
    permissions: string;
    realm: string;
    role: NxSystemRole;
    typeId: string;
    url: string;
    userId: string;
    userRoleId: string;
}

export interface NxSystemServer {
    addParams: string[];
    allowAutoRedundancy: boolean;
    authKey: string;
    backupBitrate: number;
    backupDaysOfTheWeek: string;
    backupDuration: number;
    backupStart: number;
    backupType: string;
    flags: string;
    id: string;
    ip: string;
    maxCameras: number;
    metadataStorageId: string;
    name: string;
    networkAddresses: string;
    osInfo: string;
    parentId: string;
    status: string;
    storage: any[];
    systemInfo: string;
    typeId: string;
    url: string;
    version: string;
}

interface SystemInterface {
    canMerge: boolean;
    cloudStorageCapable: boolean;
    id: string;
    info: any;
    isOnline: boolean;
    mergeInfo: any;
    stateMessage: string;
    servers: NxSystemServer[];
}

class SystemPermissions {
    editAdmins = false;
    editUsers = false;
    isAdmin = false;
}

class System implements SystemInterface {
    protected _isAvailable: boolean;
    canMerge: boolean;
    cloudStorageCapable: boolean;
    cloudStorageSystemEnabled = false;
    id: string;
    info: any;
    isOnline: boolean;
    mergeInfo: any;
    stateMessage: string;
    servers: NxSystemServer[];

    constructor() {
        this.canMerge = false;
        this.id = '';
        this.info = undefined;
        this._isAvailable = false;
        this.isOnline = false;
        this.mergeInfo = undefined;
        this.stateMessage = '';
    }
}

class UserManager {
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    private mediaserver: any;
    private _ownerEmail: string;
    private _accessRole: string;
    accessRoles: NxSystemRole[];
    currentUser: NxSystemUser;
    currentUserEmail: string;
    isMine: boolean;
    permissions: SystemPermissions;
    users: NxSystemUser[];

    constructor(config: IConfig, lang: LanguageI18NStaticTypes, mediaserver, currentUserEmail: string) {
        this.CONFIG = config;
        this.LANG = lang;
        this.mediaserver = mediaserver;
        this.currentUserEmail = currentUserEmail;

        this._ownerEmail = '';
        this._accessRole = '';
        this.accessRoles = this.CONFIG.accessRoles.predefinedRoles;
        this.isMine = false;
        this.permissions = new SystemPermissions();
    }

    get accessRole() {
        return this._accessRole;
    }

    set accessRole(accessRole) {
        this._accessRole = accessRole;
        this.checkPermissions();
    }

    set ownerEmail(email: string) {
        this._ownerEmail = email;
        this.isMine = this.currentUserEmail === email;
    }

    isAdmin(user: NxSystemRole) {
        return user.permissions && user.permissions.indexOf(this.CONFIG.accessRoles.globalAdminPermissionFlag) >= 0;
    }

    isEmptyGuid(guid?: string) {
        return guid
            ? guid.replace(/[{}0-]/gi, '') === ''
            : true;
    }

    isOwner(user: NxSystemUser) {
        return user.email === this._ownerEmail;
    }

    checkPermissions() {
        const isMine                         = this.isMine;
        const permissions: SystemPermissions = {
            editAdmins : isMine,
            editUsers  : isMine,
            isAdmin    : isMine
        };
        if (!isMine && this.currentUser) {
            permissions.editUsers = this.currentUser.permissions.indexOf(this.CONFIG.accessRoles.editUserPermissionFlag) >= 0;
            permissions.isAdmin = this.isAdmin(this.currentUser);
        } else if (this.CONFIG.accessRoles.adminAccess.indexOf(this._accessRole.toLowerCase()) > -1) {
            permissions.editUsers = true;
            permissions.isAdmin = true;
        }
        this.permissions = permissions;
    }

    deleteUser(removedUser: NxSystemUser): string {
        return this.mediaserver.deleteUser(removedUser.id).toPromise()
            .then(data => {
                this.users = this.users.filter((user) => {
                    return user.id !== data.id;
                });
            })
            .catch(() => {});
    }

    findAccessRole(user: NxSystemUser) {
        const roles = this.accessRoles || this.CONFIG.accessRoles.predefinedRoles;
        // TODO Need to figure out role type here
        const role  = roles.find((role: any) => {
            // Owner flag has top priority and overrides everything
            if (role.isOwner) {
                return this.isOwner(user);
            }
            if (!this.isEmptyGuid(role.id)) {
                return role.id === user.userRoleId;
            }

            // Admins has second priority
            if (this.isAdmin(role)) {
                return this.isAdmin(user);
            }
            return role.permissions === user.permissions;
        });

        return role || roles[roles.length - 1];
    }

    getUsersDataFromTheSystem(): Promise<NxSystemUser[] | string> {
        return this.mediaserver.getAggregatedUsersData().toPromise().then((result: any) => {
            if (!result) {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject(`Aggregated request to server has failed ${result}`);
            }
            const data = result.reply;
            const users = data['ec2/getUsers'];
            const userRoles = data['ec2/getUserRoles'];
            const predefinedRoles = data['ec2/getPredefinedRoles'];
            return new Promise((resolve) => {
                this.updateAccessRoles(predefinedRoles, userRoles);
                return resolve(this.processUsers(users));
            });
        }, () => {
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject('Media server cloud not be reached.');
        });
    }

    normalizePermissionString(permissions: string): string {
        return permissions.split('|').sort().join('|');
    }

    processUsers(users: NxSystemUser[]) {
        if (!Array.isArray(users)) {
            return false;
        }
        // const accessRightsAssoc = _.indexBy(accessRights,'userId'); // Leave commented out
        this.users = users.map((user) => {
            // @ts-ignore: TODO Can't resolve accountFullName, NxSystemUser interface might be missing properties
            if (user.accountFullName && !user.fullName) {
                // @ts-ignore TODO Can't resolve accountFullName, NxSystemUser interface might be missing properties
                user.fullName = user.accountFullName;
            }
            user.permissions = this.normalizePermissionString(user.permissions);
            user.role = this.findAccessRole(user);
            user.accessRole = user.role.name;
            // @ts-ignore: TODO Can't resolve accountID, NxSystemUser interface might be missing properties
            user.id = user.id || user.accountId;

            const isAdmin      = this.isAdmin(user);
            const isCloudOwner = this.isOwner(user);
            const isMe         = user.email === this.currentUserEmail;
            if (isMe) {
                this.currentUser = user;
                this.accessRole = user.accessRole;
            }
            user.isMe = isMe;
            user.isAdmin = isAdmin;
            // @ts-ignore: TODO having trouble resolving type for isLocalOwner
            user.isLocalOwner = !user.isCloud && user.name === 'admin';

            /**
             * User can not be edited if:
             * - this user is the current user
             * - this user is the local owner (local 'admin')
             * - this user is the cloud owner
             *
             * Furthermore, if the system is not mine and the user is an admin,
             *   they also can not be edited
             */
            // @ts-ignore: TODO having trouble resolving type for isLocalOwner
            const isNotMeOrOwner = !(isMe || user.isLocalOwner || isCloudOwner);
            user.canBeEdited = isNotMeOrOwner && (this.isMine || !isAdmin);

            return user;
        }).sort((userA, userB) => {
            // sorts local before cloud users --> then by email for cloud & name for local
            if (userA.isCloud === userB.isCloud) {
                if (userA.isCloud) {
                    return userA.email < userB.email ? -1 : 1;
                } else {
                    return userA.name < userB.name ? -1 : 1;
                }
            }
            return userA.isCloud ? 1 : -1;
        });

        return this.users;
    }

    saveUser(user: NxSystemUser, role: NxSystemRole) {
        user.email = user.email.toLowerCase();
        let userCreated = false;
        if (user.email === this.currentUserEmail) {
            if (user.isCloud) {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: 'cantEditYourself' });
            } else {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
            }
        }

        if (!user.id) {
            let existingUser = this.users.find((u) => {
                return user.email === u.email;
            });
            if (!existingUser) { // user not found - create a new one
                userCreated = true;
                existingUser = this.mediaserver.userObject(user.fullName, user.email);
            }
            user = { ...existingUser, ...user };
        }

        if (!user.canBeEdited && !this.isMine) {
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        user.userRoleId = role.id || '';
        user.permissions = role.permissions || '';

        // TODO: remove later
        // this.cloudApi.share(this.id, user.email, accessRole);

        return this.mediaserver.saveUser(user).toPromise().then(result => {
            user.id = result.id;
            user.role = role;
            user.accessRole = role.name || role.label;
            if (userCreated) {
                this.users.push(user);
            }
            return result;
        });
    }

    updateAccessRoles(predefinedRoles: NxSystemRole[], userDefinedRoles: NxSystemRole[]) {
        predefinedRoles.forEach((role: NxSystemRole) => {
            role.permissions = this.normalizePermissionString(role.permissions);
            role.isAdmin = this.isAdmin(role);
        });

        const userRolesList = userDefinedRoles.map((userRole: NxSystemRole) => {
            userRole.isAdmin = this.isAdmin(userRole);
            userRole.permissions = this.normalizePermissionString(userRole.permissions);
            return userRole;
        }).sort((userRoleA, userRoleB) => {
            return userRoleA.name < userRoleB.name ? -1 : 1;
        });

        const newRoles = Array.from(new Set([...predefinedRoles, ...userRolesList, this.CONFIG.accessRoles.customPermission]));
        if (!NxUtilsService.isEqual(newRoles, this.accessRoles)) {
            this.accessRoles = newRoles;
        }
        return this.accessRoles;
    }
}

class ServerManager {
    mediaserverConnections: {
        // Need to fine proper type for connection
        [key: string]: any
    };

    servers: NxSystemServer[];

    constructor(private mediaserver: NxSystemAPI,
                private systemApiService: NxSystemAPIService,
                private currentUserEmail: string,
                private systemId: string,
                private cloudApi: NxCloudApiService
    ) {
    }

    initSystemMediaServers() {
        if (this.servers.length) {
            this.mediaserverConnections = this.servers.reduce((mediaserverConnections, server) => {
                mediaserverConnections[server.id] = this.systemApiService
                    .createConnection(
                        this.currentUserEmail,
                                                              `${server.id.replace(/[{}]/g, '')}.${this.systemId}`, // a different way of proxying: serverId.systemId,
                                                              undefined,
                                                              () => this.cloudApi.getSystemAuth(this.systemId).toPromise().then((authKeys: any) => {
                                                                  this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                                                                  return Promise.resolve(true);
                                                              }));
                const { authGet, authPost, authPlay } = this.mediaserver.getAuthKeys();
                mediaserverConnections[server.id].setAuthKeys(authGet, authPost, authPlay);
                return mediaserverConnections;
            }, {});
            return Promise.resolve(this.mediaserverConnections);
        }
        return Promise.reject();
    }

    getServers() {
        return this.mediaserver.getMediaServers().toPromise()
            .then((result: any) => {
                if (!result) {
                    return Promise.reject(new Error(`Request to server has failed ${result}`));
                }
                this.servers = result;
                return this.servers;
            });
    }

    getModuleInfo(serverId?) {
        if (serverId) {
            return this.mediaserverConnections[serverId].getModuleInfo();
        } else {
            return this.mediaserver.getModuleInfo();
        }
    }

    changeServerPort(port, serverId) {
        return this.mediaserverConnections[serverId].changePort(port)
            .catch(err => Promise.reject(err));
    }

    renameServer(serverId, serverName) {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].renameServer(cleanServerId, serverName);
    }

    restartServer(serverId) {
        return this.mediaserverConnections[serverId].restartServer()
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId, currentPassword) {
        return this.mediaserverConnections[serverId].detachFromSystem(currentPassword);
    }

    removeMediaserver(serverId) {
        return this.mediaserver.removeMediaserver(serverId);
    }

    restoreFactorySettings(serverId, currentPassword) {
        return this.mediaserverConnections[serverId].restoreFactorySettings(currentPassword);
    }
}

export class NxSystem extends System implements OnDestroy {
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    private cloudApi: NxCloudApiService;
    private systemApiService: any;
    private pollService: any;
    private systemsService: any;
    private userManager: UserManager;
    private serverManager: ServerManager;
    private _subscribersCount = new BehaviorSubject<number>(0);

    activeSubscription: any;
    currentUserEmail: string;
    mediaserver: any;
    currentServerNotBusy: boolean;
    moduleInfo: any;

    infoPromise: any;
    usersPromise: any;
    systemPoll: any;

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

    get systemInfo() {
        return this.infoSubject.getValue();
    }

    set systemInfo(system: NxSystem) {
        this.infoSubject.next(system);
    }

    // Start of userManger functions
    get accessRole() {
        return this.userManager.accessRole;
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

    // End of userManager get functions

    // Start of serverManager functions
    get servers() {
        return this.serverManager.servers;
    }

    // End of serverManager functions

    constructor(CONFIG: IConfig,
        LANG: LanguageI18NStaticTypes,
        cloudApi: NxCloudApiService,
        systemApiService: NxSystemAPIService,
        pollService: NxPollService,
        systemsService: NxSystemsService,
        currentUserEmail: string,
        systemId?: string,
        serverId?: string
    ) {
        super();
        this.CONFIG = CONFIG;
        this.LANG = LANG;
        this.cloudApi = cloudApi;
        this.systemApiService = systemApiService;
        this.pollService = pollService;
        this.systemsService = systemsService;
        this.lostConnection = false;
        this.initSystem(currentUserEmail, systemId, serverId);
        // this._subscribersCount.subscribe((subscribers) => {
        //     console.log(`Current Subscribers for ${systemId || serverId}: ${subscribers}`);
        // });
    }

    private updateSystemState() {
        this.stateMessage = '';
        if (!this.isAvailable) {
            this.stateMessage = this.LANG.system.status.unavailable;
        }
        if (!this.isOnline) {
            this.stateMessage = this.LANG.system.status.offline;
        }
    }

    ngOnDestroy() {
        if (this.systemPoll) {
            this.systemPoll.unsubscribe();
        }
    }

    initSystem(currentUserEmail, systemId?, serverId?) {
        this.id = systemId || serverId;
        this.isAvailable = false;
        this.isOnline = false;
        this.currentServerNotBusy = true;
        this.info = { name: '' };
        this.mergeInfo = {};
        this.cloudStorageSystemEnabled = false;

        this.currentUserEmail = currentUserEmail;
        if (systemId) {
            this.cloudApi.getCloudStorageUsage(systemId)
                .then(() => {
                    this.cloudStorageSystemEnabled = true;
                }, () => {
                    this.cloudStorageSystemEnabled = false;
                });
        }
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
        this.systemPoll = this.pollService.createPoll(this.update(), this.CONFIG.updateInterval);
        this.userManager = new UserManager(this.CONFIG, this.LANG, this.mediaserver, currentUserEmail);
        this.serverManager = new ServerManager(
            this.mediaserver,
            this.systemApiService,
            this.currentUserEmail,
            this.id,
            this.cloudApi
        );
    }

    updateSystemAuth(force?) {
        if (!force && this.mediaserver.authGet) { // no need to update
            return Promise.resolve(true);
        }
        return this.cloudApi.getSystemAuth(this.id).toPromise().then((authKeys: any) => {
            this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
            return Promise.resolve(true);
        });
    }

    canViewInfo() {
        return this.CONFIG.accessRoles.adminAccess.includes(this.accessRole.toLowerCase());
    }

    canUserViewCloudStorage() {
        return this.CONFIG.cloudCapabilities.cloudStorageEnabled && this.isMine || this.isAdmin && this.systemInfo.cloudStorageSystemEnabled;
    }

    getInfoAndPermissions(useCache = true) {
        return this.systemsService
            .getSystemAsPromise(this.id, useCache)
            .then((response: any) => {
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
                this.cloudStorageCapable = this.info.capabilities && this.info.capabilities.cloudStorage;
                this.mergeInfo = response.mergeInfo;
                if (this.id) {
                    this.cloudApi.getCloudStorageUsage(this.id).then(() => {
                        this.cloudStorageSystemEnabled = true;
                    }, () => {
                        this.cloudStorageSystemEnabled = false;
                    });
                }
                this.systemInfo = this;
                if (!this.userManager.accessRole) {
                    this.userManager.accessRole = this.info.accessRole;
                }
                return Promise.resolve(this);
            });
    }

    getInfo(force?, useCache = true) {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = this.updateSystemAuth().then(() => {
                return this.getInfoAndPermissions(useCache);
            });
        }
        return this.infoPromise;
    }

    getUsersCachedInCloud() {
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
        });
    }

    getUsersDataFromTheSystem() {
        return this.userManager.getUsersDataFromTheSystem();
    }

    getUsers(reload?) {
        if (!this.usersPromise || reload) {
            let usersPromise: Promise<any>;
            if (this.isOnline) { // Two separate cases - either we get info from the system (presuming it has actual names)
                usersPromise = this.userManager.getUsersDataFromTheSystem().then(() => {
                    this.isAvailable = true;
                }).catch(() => {
                    return this.getUsersCachedInCloud();
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

    getSystem() {
        return this.serverManager.getModuleInfo()
            .pipe(tap((moduleInfo: any) => {
                this.moduleInfo = moduleInfo.reply;
            })).toPromise();
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
        return this.cloudApi.unshare(this.id, this.currentUserEmail).toPromise();
    }

    startPoll() {
        if (this.subscriberCount === 0) {
            if (this.mediaserver.authGet) {
                this.subscriberCount++;
                this.activeSubscription = this.systemPoll
                    .subscribe(() => {
                        this.systemInfo = this;
                    });
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
            if (this.systemPoll) {
                this.systemPoll.unsubscribe();
            }
            if (this.activeSubscription) {
                this.activeSubscription.unsubscribe();
            }

            this.infoPromise = undefined;
            this.usersPromise = undefined;
            this.systemInfo = undefined;
            this.subscriberCount--;
        }
    }

    update() {
        return of('').pipe(flatMap(() => {
            return this.getInfo(true, false)
                .then(() => this.getSystem())
                .then(() => this.getServers())
                .then(() => from(this.getUsers(true)))
                .catch(() => {
                    this.isAvailable = false;
                    this.lostConnection = true;
                });
        }));
    }

    logLevel(serverId) {
        return this.mediaserver.logLevel(serverId);
    }

    updateOrGetSystemSettings(updateParams = {}) {
        return this.mediaserver.updateOrGetSettings(updateParams);
    }

    updateOrGetSystemStorage(updateParams?) {
        if (updateParams) {
            return this.mediaserver.updateStorages(updateParams);
        }
        return this.mediaserver.getStorages();
    }

    initSystemMediaServers() {
        return this.serverManager.initSystemMediaServers();
    }

    getServers() {
        return this.serverManager.getServers();
    }

    getModuleInfo(serverId?) {
        return this.serverManager.getModuleInfo(serverId);
    }

    changeServerPort(port, serverId) {
        return this.serverManager.changeServerPort(port, serverId);
    }

    renameServer(serverId, serverName) {
        return this.serverManager.renameServer(serverId, serverName)
            .then(() => this.update().toPromise())
            .catch(err => Promise.reject(err));
    }

    restartServer(serverId) {
        this.currentServerNotBusy = false;
        return this.serverManager.restartServer(serverId);
    }

    detachFromSystem(serverId, currentPassword) {
        this.currentServerNotBusy = false;
        return this.serverManager.detachFromSystem(serverId, currentPassword);
    }

    removeMediaserver(serverId) {
        return this.serverManager.removeMediaserver(serverId);
    }

    restoreFactorySettings(serverId, currentPassword) {
        this.currentServerNotBusy = false;
        return this.serverManager.restoreFactorySettings(serverId, currentPassword);
    }

    mergeSystems(url, dryRun, currentPassword?) {
        return this.mediaserver.mergeSystems(url, dryRun, currentPassword);
    }

    getPeerSystems() {
        return this.mediaserver.getPeerSystems();
    }

    checkLocalAdminPassword(password) {
        return this.mediaserver.checkLocalAdminPassword(password);
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private systemsCache: { [key: string]: System };

    constructor(configService: NxConfigService,
                private languageService: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private systemApiService: NxSystemAPIService,
                private pollService: NxPollService,
                private systemsService: NxSystemsService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.getTranslations();
        this.systemsCache = {};
    }

    createSystem(currentUserEmail, systemId, serverId?) {
        let system;
        const id = systemId || serverId;
        if (id in this.systemsCache) {
            system = this.systemsCache[id];
        } else {
            system = new NxSystem(
                this.CONFIG, this.LANG,
                this.cloudApi, this.systemApiService,
                this.pollService, this.systemsService,
                currentUserEmail, systemId, serverId
            );
            this.systemsCache[id] = system;
        }
        system.lostConnection = false;
        system.startPoll();
        return system;
    }
}
