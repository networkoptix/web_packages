import * as _ from 'underscore';
import { NxConfigService } from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxCloudApiService } from './nx-cloud-api';
import { NxSystemsService } from './systems.service';
import { Injectable, OnDestroy } from '@angular/core';
import { NxSystemAPIService } from './system-api.service';
import { BehaviorSubject, from, of } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { NxPollService } from './poll.service';


export interface NxSystemRole {
    id: string;
    isAdmin: boolean;
    isOwner: boolean;
    label: string;
    name: string;
    permissions: string;
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
    addParams: any[];
    allowAutoRedundancy: boolean;
    authKey: string;
    backupBitrate: number;
    backupDaysOfTheWeek: string;
    backupDuration: number;
    backupStart: number;
    backupType: string;
    flags: string;
    id: string;
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
    id: string;
    info: any;
    isOnline: boolean;
    mergeInfo: any;
    stateMessage: string;
    servers: NxSystemServer[];

    constructor () {
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
    private CONFIG: any;
    private LANG: any;
    private mediaserver: any;
    private _ownerEmail: string;
    private _accessRole: string;
    accessRoles: NxSystemRole[];
    currentUser: NxSystemUser;
    currentUserEmail: string;
    isMine: boolean;
    permissions: SystemPermissions;
    users: NxSystemUser[];

    constructor(config, lang, mediaserver, currentUserEmail) {
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

    set ownerEmail(email) {
        this._ownerEmail = email;
        this.isMine = this.currentUserEmail === email;
    }

    isAdmin(user) {
        return user.permissions && user.permissions.indexOf(this.CONFIG.accessRoles.globalAdminPermissionFlag) >= 0;
    }

    isEmptyGuid(guid) {
        if (!guid) {
            return true;
        }
        guid = guid.replace(/[{}0\-]/gi, '');
        return guid === '';
    }

    isOwner(user) {
        return user.email === this._ownerEmail;
    }

    checkPermissions() {
        const isMine = this.isMine;
        const permissions: SystemPermissions = {
            editAdmins: isMine,
            editUsers: isMine,
            isAdmin: isMine
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

    deleteUser(removedUser: NxSystemUser) {
        return this.mediaserver.deleteUser(removedUser.id).toPromise().then(() => {
            this.users = this.users.filter((user) => user !== removedUser);
        });
    }

    findAccessRole(user: NxSystemUser) {
        const roles = this.accessRoles || this.CONFIG.accessRoles.predefinedRoles;
        const role = roles.find((role) => {
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

    getUsersDataFromTheSystem() {
        return this.mediaserver.getAggregatedUsersData().toPromise().then((result: any) => {
            if (!result) {
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
        }, (error) => {
            return Promise.reject('Media server cloud not be reached.');
        });
    }

    normalizePermissionString(permissions) {
        return permissions.split('|').sort().join('|');
    }

    processUsers(users) {
        if (!Array.isArray(users)) {
            return false;
        }
        // const accessRightsAssoc = _.indexBy(accessRights,'userId'); // Leave commented out
        this.users = users.map((user) => {
            if (user.accountFullName && !user.fullName) {
                user.fullName = user.accountFullName;
            }
            user.permissions = this.normalizePermissionString(user.permissions);
            user.role = this.findAccessRole(user);
            user.accessRole = user.role.name;
            user.id = user.id || user.accountId;

            const isAdmin = this.isAdmin(user);
            const isCloudOwner = this.isOwner(user);
            const isMe = user.email === this.currentUserEmail;
            if (isMe) {
                this.currentUser = user;
                this._accessRole = user.accessRole;
                this.checkPermissions();
            }
            user.isMe = isMe;
            user.isAdmin = isAdmin;
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
            const isNotMeOrOwner = !(isMe || user.isLocalOwner || isCloudOwner);
            user.canBeEdited = isNotMeOrOwner && (this.isMine || !isAdmin);

            return user;
        }).sort((userA, userB) => {
            // sorts local before cloud users --> then by email for cloud & name for local
            if (userA.isCloud === userB.isCloud) {
                if (userA.isCloud === true) {
                    return userA.email < userB.email ? -1 : 1;
                } else {
                    return userA.name < userB.name ? -1 : 1;
                }
            }
            return userA.isCloud === true ? 1 : -1;
        });

        return this.users;
    }

    saveUser(user: NxSystemUser, role: NxSystemRole) {
        user.email = user.email.toLowerCase();
        let userCreated = false;
        if (user.email === this.currentUserEmail) {
            if (user.isCloud) {
                return Promise.reject({ resultCode: 'cantEditYourself' });
            } else {
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
            user = {...existingUser, ...user};
        }

        if (!user.canBeEdited && !this.isMine) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        user.userRoleId = role.id || '';
        user.permissions = role.permissions || '';

        // TODO: remove later
        // this.cloudApi.share(this.id, user.email, accessRole);

        return this.mediaserver.saveUser(user).toPromise().then((result) => {
            if (userCreated) {
                this.users.push(user);
            }
            user.role = role;
            user.accessRole = role.name || role.label;
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

        this.accessRoles = Array.from(new Set([...predefinedRoles, ...userRolesList]));
        this.accessRoles.push(this.CONFIG.accessRoles.customPermission);
        return this.accessRoles;
    }
}


class ServerManager {
    private mediaserver: any;
    private systemApiService: any;
    private currentUserEmail: string;
    private systemId: string;
    private cloudApi: any;
    mediaserverConnections: any;
    servers: NxSystemServer[];

    constructor(mediaserver, systemApiService, currentUserEmail, systemId, cloudApi) {
        this.mediaserver = mediaserver;
        this.systemApiService = systemApiService;
        this.currentUserEmail = currentUserEmail;
        this.systemId = systemId;
        this.cloudApi = cloudApi;
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
                const { authGet, authPost, authPlay } = this.mediaserver;
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
                    return Promise.reject(`Request to server has failed ${result}`);
                }
                this.servers = result;
                return this.servers;
            });
    }

    getModuleInfo(serverId) {
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
    private CONFIG: any;
    private LANG: any;
    private cloudApi: any;
    private systemApiService: any;
    private pollService: any;
    private systemsService: any;
    private userManager: UserManager;
    private serverManager: ServerManager;
    private _subscribersCount = new BehaviorSubject<number>(0);

    activeSubscription: any;
    currentUserEmail: string;
    mediaserver: any;
    mediaserverConnections: any;
    currentServerNotBusy: boolean;

    infoPromise: any;
    usersPromise: any;
    systemPoll: any;

    pauseUpdate = false;

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

    constructor(CONFIG, LANG, cloudApi, systemApiService, pollService, systemsService, currentUserEmail, systemId?, serverId?) {
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
        this.updateSystemAuth(true).then(() => {});
        this.systemPoll = this.pollService.createPoll(this.update(), this.CONFIG.updateInterval);
        this.userManager = new UserManager(this.CONFIG, this.LANG, this.mediaserver, currentUserEmail);
        this.serverManager = new ServerManager(
            this.mediaserver,
            this.systemApiService,
            this.currentUserEmail,
            this.id,
            this.cloudApi,
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

    getInfoAndPermissions(useCache = true) {
        return this.systemsService
            .getSystemAsPromise(this.id, useCache)
            .then((response: any) => {
                const error = this.cloudApi.checkResponseHasError(response);
                if (error) {
                    return Promise.reject(error);
                }

                if (!response) {
                    return Promise.reject({ data: { resultCode: 'forbidden' } });
                }
                if (this.info) {
                    _.extend(this.info, response); // Update
                } else {
                    this.info = response;
                }
                this.userManager.ownerEmail = this.info.ownerAccountEmail;
                this.isOnline = this.info.stateOfHealth === this.CONFIG.systemStatuses.onlineStatus;
                this.canMerge = this.userManager.isMine && (this.info.capabilities && this.info.capabilities.cloudMerge);
                this.mergeInfo = response.mergeInfo;
                this.systemInfo = this;
                this.userManager.accessRole = this.info.accessRole;
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
                    this.isAvailable = false;
                    return this.getUsersCachedInCloud();
                });
            } else { // or we get old cached data from the cloud
                usersPromise = this.getUsersCachedInCloud().then((users) => {
                    return this.userManager.processUsers(users);
                });
            }

            this.usersPromise = usersPromise.then(() => {
                this.userManager.checkPermissions();
                // If system is reported to be online - try to get actual users list
                this.systemInfo = this;
                return;
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
        if (this.currentUser && this.isAvailable) {
            // Handling promise to satisfy the linter.
            this.userManager.deleteUser(this.currentUser).toPromise().then(() => {}); // Try to remove me from the system directly
        }
        // Anyway - send another request to cloud_db to remove my this
        return this.cloudApi.unshare(this.id, this.currentUserEmail).toPromise();
    }

    startPoll() {
        if (this.subscriberCount === 0) {
            if (this.mediaserver.authGet) {
                this.subscriberCount++;
                this.activeSubscription = this.systemPoll.subscribe(() => {
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
                .then(() => this.getServers())
                .then(() => {
                    if (this.permissions.editUsers) {
                        return from(this.getUsers(true));
                    }
                    return of('');
                })
                .catch(() => {
                    this.isAvailable = false;
                    this.lostConnection = true;
                });
        }));
    }

    updateOrGetSystemSettings(updateParams = {}) {
        return this.mediaserver.updateOrGetSettings(updateParams);
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

    getPeerSystems() {
        return this.mediaserver.getPeerSystems();
    }

    checkLocalAdminPassword(password) {
        return this.mediaserver.checkLocalAdminPassword(password)
    }
}


@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: any;
    LANG: any;
    private systemsCache: { [key: string]: System };

    constructor(private config: NxConfigService,
                private languageService: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private systemApiService: NxSystemAPIService,
                private pollService: NxPollService,
                private systemsService: NxSystemsService) {
        this.CONFIG = this.config.getConfig();
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
