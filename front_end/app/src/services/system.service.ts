import * as _ from 'underscore';
import { NxConfigService } from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxCloudApiService } from './nx-cloud-api';
import { NxSystemsService } from './systems.service';
import { Injectable, OnDestroy } from '@angular/core';
import { NxSystemAPIService } from './system-api.service';
import { from, of, ReplaySubject } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { NxPollService } from './poll.service';


interface SystemInterface {
    accessRole: any;
    accessRoles: any;
    canMerge: boolean;
    id: string;
    info: any;
    isAvailable: boolean;
    isMine: boolean;
    isOnline: boolean;
    mergeInfo: any;
    permissions: any;
    predefinedRoles: any;
    stateMessage: string;
    users: any;
    userRoles: any;
}


class System implements SystemInterface {
    accessRole: any;
    accessRoles: any;
    canMerge: boolean;
    id: string;
    info: any;
    isAvailable: boolean;
    isMine: boolean;
    isOnline: boolean;
    mergeInfo: any;
    permissions: any;
    predefinedRoles: any;
    stateMessage: string;
    users: any;
    userRoles: any;

    constructor () {
        this.accessRole = '';
        this.accessRoles = undefined;
        this.canMerge = false;
        this.id = '';
        this.info = undefined;
        this.isAvailable = false;
        this.isMine = false;
        this.isOnline = false;
        this.mergeInfo = undefined;
        this.permissions = undefined;
        this.predefinedRoles = undefined;
        this.stateMessage = '';
        this.users = undefined;
        this.userRoles = undefined;
    }
}


export class NxSystem extends System implements OnDestroy {
    private CONFIG: any;
    private LANG: any;
    private cloudApi: any;
    private systemApiService: any;
    private pollService: any;
    private systemsService: any;

    activeSubscription: any;
    currentUserEmail: string;
    currentUser: any;
    mediaserver: any;
    predefinedRoles: any;

    infoPromise: any;
    usersPromise: any;
    systemPoll: any;

    systemSubject = new ReplaySubject(0);

    constructor(CONFIG, LANG, cloudApi, systemApiService, pollService, systemsService, systemId, currentUserEmail) {
        super();
        this.CONFIG = CONFIG;
        this.LANG = LANG;
        this.cloudApi = cloudApi;
        this.systemApiService = systemApiService;
        this.pollService = pollService;
        this.systemsService = systemsService;
        this.init();
        this.initSystem(systemId, currentUserEmail);
    }

    ngOnDestroy() {
        if (this.systemPoll) {
            this.systemPoll.unsubscribe();
        }
    }

    init() {
        this.CONFIG.accessRoles.predefinedRoles.forEach((option) => {
            if (option.permissions) {
                option.permissions = this.normalizePermissionString(option.permissions);
            }
        });
    }

    initSystem(systemId, currentUserEmail) {
        this.id = systemId;
        this.users = [];
        this.isAvailable = false;
        this.isOnline = false;
        this.isMine = false;
        this.userRoles = [];
        this.info = { name: '' };
        this.permissions = {};
        this.accessRole = '';
        this.mergeInfo = {};
        this.accessRoles = this.CONFIG.accessRoles.predefinedRoles;

        this.currentUserEmail = currentUserEmail;
        this.mediaserver = this.systemApiService.createConnection(currentUserEmail, systemId, undefined, () => {
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
        this.updateSystemAuth(true).catch(() => {});
        this.updateSystemState();
        this.systemPoll = this.pollService.createPoll(this.update(), this.CONFIG.updateInterval);
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

    updateSystemState() {
        this.stateMessage = '';
        if (!this.isAvailable) {
            this.stateMessage = this.LANG.system.unavailable;
        }
        if (!this.isOnline) {
            this.stateMessage = this.LANG.system.offline;
        }
    }

    checkPermissions(offline?) {
        this.permissions = {};
        this.accessRole = this.info.accessRole;
        if (this.currentUser) {
            if (!offline) {
                const role = this.findAccessRole(this.currentUser);
                this.accessRole = role.name;
            }
            this.permissions.editAdmins = this.isOwner(this.currentUser);
            this.permissions.isAdmin = this.isOwner(this.currentUser) || this.isAdmin(this.currentUser);
            this.permissions.editUsers = this.permissions.isAdmin || this.currentUser.permissions.indexOf(this.CONFIG.accessRoles.editUserPermissionFlag) >= 0;
        } else {
            this.accessRole = this.info.accessRole;
            if (this.isMine) {
                this.permissions.editUsers = true;
                this.permissions.editAdmins = true;
                this.permissions.isAdmin = true;
            } else {
                this.permissions.editUsers = this.info.accessRole.indexOf(this.CONFIG.accessRoles.editUserAccessRoleFlag) >= 0;
                this.permissions.isAdmin = this.info.accessRole.indexOf(this.CONFIG.accessRoles.globalAdminAccessRoleFlag) >= 0;
            }
        }
    }

    getInfoAndPermissions() {
        return this.systemsService
                   .getSystemAsPromise(this.id)
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
                       this.isOnline = this.info.stateOfHealth === this.CONFIG.systemStatuses.onlineStatus;
                       this.isMine = this.info.ownerAccountEmail === this.currentUserEmail;
                       this.canMerge = this.isMine && (this.info.capabilities && this.info.capabilities.indexOf(this.CONFIG.systemCapabilities.cloudMerge) > -1);
                       this.mergeInfo = response.mergeInfo;

                       this.checkPermissions();
                       return this.info;
                   });
    }

    getInfo(force?) {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = this.updateSystemAuth().then(() => {
               return this.getInfoAndPermissions();
            });
        }
        return this.infoPromise;
    }

    getUsersCachedInCloud() {
        this.isAvailable = false;
        this.updateSystemState();
        return this.cloudApi.users(this.id).toPromise().then((data: any) => {
            if (data && data.resultCode === 'forbidden') {
                return Promise.reject(data);
            }
            data.forEach((user) => {
                user.permissions = this.normalizePermissionString(user.customPermissions);
                user.email = user.accountEmail;
            });
            return data;
        });
    }

    normalizePermissionString(permissions) {
        return permissions.split('|').sort().join('|');
    }

    isEmptyGuid(guid) {
        if (!guid) {
            return true;
        }
        guid = guid.replace(/[{}0\-]/gi, '');
        return guid === '';
    }

    isOwner(user) {
        return user.isAdmin || user.email === this.info.ownerAccountEmail;
    }

    isAdmin(user) {
        return user.permissions && user.permissions.indexOf(this.CONFIG.accessRoles.globalAdminPermissionFlag) >= 0;
    }

    updateAccessRoles() {
        const userRolesList = this.userRoles.map((userRole) => {
            return {
                name: userRole.name,
                userRoleId: userRole.id,
                userRole
            };
        });
        this.accessRoles = Array.from(new Set([...this.predefinedRoles, ...userRolesList]));
        this.accessRoles.push(this.CONFIG.accessRoles.customPermission);
        return this.accessRoles;
    }

    findAccessRole(user) {
        if (!user.isEnabled) {
            return { name: 'Disabled' };
        }
        const roles = this.accessRoles || this.CONFIG.accessRoles.predefinedRoles;
        const role = roles.find((role) => {

            if (role.isOwner) { // Owner flag has top priority and overrides everything
                return role.isOwner === user.isAdmin;
            }
            if (!this.isEmptyGuid(role.userRoleId)) {
                return role.userRoleId === user.userRoleId;
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
        const processUsers = (users, userRoles, predefinedRoles) => {
            this.predefinedRoles = predefinedRoles;
            this.predefinedRoles.forEach((role) => {
                role.permissions = this.normalizePermissionString(role.permissions);
                role.isAdmin = this.isAdmin(role);
            });

            userRoles.sort((userRoleA, userRoleB) => {
                return userRoleA.name < userRoleB.name ? -1 : 1;
            });
            this.userRoles = userRoles;
            this.updateAccessRoles();

            users = users.filter((user) => {
                return user.isCloud;
            });
            // const accessRightsAssoc = _.indexBy(accessRights,'userId'); // Leave commented out
            users.forEach((user) => {
                user.permissions = this.normalizePermissionString(user.permissions);
            });

            return users;
        };

        return this.mediaserver.getAggregatedUsersData().toPromise().then((result: any) => {
            if (!result) {
                return Promise.reject(`Aggregated request to server has failed ${result}`);
            }
            const data = result.reply;
            const usersList = data['ec2/getUsers'];
            const userRoles = data['ec2/getUserRoles'];
            const predefinedRoles = data['ec2/getPredefinedRoles'];
            this.isAvailable = true;
            this.updateSystemState();
            return processUsers(usersList, userRoles, predefinedRoles);
        }, (error) => {
            this.isAvailable = false;
            this.updateSystemState();
            return;
        });
    }

    getUsers(reload?) {
        if (!this.usersPromise || reload) {
            let usersPromise: Promise<any>;
            if (this.isOnline) { // Two separate cases - either we get info from the system (presuming it has actual names)
                usersPromise = this.getUsersDataFromTheSystem().catch((error) => this.getUsersCachedInCloud());
            } else { // or we get old cached data from the cloud
                usersPromise = this.getUsersCachedInCloud();
            }

            this.usersPromise = usersPromise.then((users) => {
                if (!Array.isArray(users)) {
                    return false;
                }
                // Sort users here
                this.users = users.map((user) => {
                    const isMe = user.email === this.currentUserEmail;
                    const isOwner = this.isOwner(user);
                    const isAdmin = this.isAdmin(user);

                    if (user.accountFullName && !user.fullName) {
                        user.fullName = user.accountFullName;
                    }
                    user.role = this.findAccessRole(user);
                    user.accessRole = user.role.name;
                    user.id = user.id || user.accountId;
                    user.canBeDeleted = !isOwner && (!isAdmin || this.isMine);
                    user.canBeEdited = !isOwner && !isMe && (!isAdmin || this.isMine) && user.isEnabled;

                    if (user.email === this.currentUserEmail) {
                        this.currentUser = user;
                        this.checkPermissions(true);
                    }
                    return user;
                }).sort((userA, userB) => {
                    const userARole = -this.CONFIG.accessRoles.order.indexOf(userA.accessRole);
                    const userBRole = -this.CONFIG.accessRoles.order.indexOf(userB.accessRole);
                    return userARole < userBRole ? -1 : 1;
                });
                // If system is reported to be online - try to get actual users list
                this.systemSubject.next(this);
                return this.users;
            }).catch(() => {});

        }
        return this.usersPromise;
    }

    saveUser(user, role) {
        user.email = user.email.toLowerCase();
        const accessRole = role.name || role.label;

        if (!user.userId) {
            if (user.email === this.currentUserEmail) {
                return Promise.reject({ resultCode: 'cantEditYourself' });
            }

            let existingUser = this.users.find((u) => {
                return user.email === u.email;
            });
            if (!existingUser) { // user not found - create a new one
                existingUser = this.mediaserver.userObject(user.fullName, user.email);
                this.users.push(existingUser);
            }
            user = existingUser;

            if (!user.canBeEdited && !this.isMine) {
                return Promise.reject({ resultCode: 'cantEditAdmin' });
            }
        }

        user.userRoleId = role.userRoleId || '';
        user.permissions = role.permissions || '';

        // TODO: remove later
        // this.cloudApi.share(this.id, user.email, accessRole);

        return this.mediaserver.saveUser(user).toPromise().then((result) => {
            user.role = role;
            user.accessRole = accessRole;
        });
    }

    deleteUser(removedUser) {
        return this.mediaserver.deleteUser(removedUser.id).toPromise().then(() => {
            this.users = this.users.filter((user) => user !== removedUser);
        });
    }

    deleteFromCurrentAccount() {
        if (this.currentUser && this.isAvailable) {
            this.mediaserver.deleteUser(this.currentUser.id).toPromise.catch(() => {}); // Try to remove me from the system directly
        }
        // Anyway - send another request to cloud_db to remove my this
        return this.cloudApi.unshare(this.id, this.currentUserEmail).toPromise();
    }

    startPoll() {
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        if (this.mediaserver.authGet) {
            this.activeSubscription = this.systemPoll.subscribe((system) => {
                this.systemSubject.next(this);
            });
        } else {
            setTimeout(() => this.startPoll(), 1000);
        }
    }

    stopPoll() {
        if (this.systemPoll) {
            this.systemPoll.unsubscribe();
        }
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        this.systemSubject = new ReplaySubject(0);
    }

    // Temporary fix will investigate when I get back
    update() {
        return from(this.getInfo()).pipe(flatMap((res) => {
            if (this.permissions.editUsers) {
                this.getUsers();
            }
            return of(true);
        }));
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

    createSystem(systemId, currentUserEmail) {
        let system;
        if (systemId in this.systemsCache) {
            system = this.systemsCache[systemId];
        } else {
            system = new NxSystem(
                this.CONFIG, this.LANG,
                this.cloudApi, this.systemApiService,
                this.pollService, this.systemsService,
                systemId, currentUserEmail
            );
            this.systemsCache[systemId] = system;
        }
        system.startPoll();
        return system;
    }
}
