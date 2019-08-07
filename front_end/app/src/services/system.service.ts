import * as _ from 'underscore';
import { NxConfigService } from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxCloudApiService } from './nx-cloud-api';
import { NxSystemsService } from './systems.service';
import { Injectable, OnDestroy } from '@angular/core';
import { NxSystemAPI } from './system-api.service';
import { from, ReplaySubject } from 'rxjs';
import { tap } from 'rxjs/operators';
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


@Injectable({
    providedIn: 'root'
})
export class NxSystemService implements OnDestroy {
    systems: any;
    CONFIG: any;
    LANG: any;

    activeSubscription: any;
    auth: any;
    currentUserEmail: string;
    currentUser: any;
    predefinedRoles: any;

    infoPromise: any;
    usersPromise: any;
    systemPoll: any;

    system: System;
    systemSubject = new ReplaySubject(0);

    constructor(private config: NxConfigService,
                private languageService: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private mediaserver: NxSystemAPI,
                private pollService: NxPollService,
                private systemsService: NxSystemsService) {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.languageService.getTranslations();
        this.init();
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
        this.system = new System();
        this.system.id = systemId;
        this.system.users = [];
        this.system.isAvailable = false;
        this.system.isOnline = false;
        this.system.isMine = false;
        this.system.userRoles = [];
        this.system.info = { name: '' };
        this.system.permissions = {};
        this.system.accessRole = '';
        this.system.mergeInfo = {};
        this.system.accessRoles = this.CONFIG.accessRoles.predefinedRoles;

        this.currentUserEmail = currentUserEmail;

        this.mediaserver.init(currentUserEmail, systemId, undefined, () => {
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
        this.updateSystemAuth(true);
        this.updateSystemState();
        this.systemPoll = this.pollService.createPoll(from(this.update2()), this.CONFIG.updateInterval);
    }

    updateSystemAuth(force?) {
        if (!force && this.auth) { // no need to update
            return Promise.resolve(true);
        }
        this.auth = false;
        return this.cloudApi.getSystemAuth(this.system.id).subscribe((authKeys: any) => {
            this.auth = true;
            return this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
        });
    }

    updateSystemState() {
        this.system.stateMessage = '';
        if (!this.system.isAvailable) {
            this.system.stateMessage = this.LANG.system.unavailable;
        }
        if (!this.system.isOnline) {
            this.system.stateMessage = this.LANG.system.offline;
        }
    }

    checkPermissions(offline?) {
        this.system.permissions = {};
        this.system.accessRole = this.system.info.accessRole;
        if (this.currentUser) {
            if (!offline) {
                const role = this.findAccessRole(this.currentUser);
                this.system.accessRole = role.name;
            }
            this.system.permissions.editAdmins = this.isOwner(this.currentUser);
            this.system.permissions.isAdmin = this.isOwner(this.currentUser) || this.isAdmin(this.currentUser);
            this.system.permissions.editUsers = this.system.permissions.isAdmin || this.currentUser.permissions.indexOf(this.CONFIG.accessRoles.editUserPermissionFlag) >= 0;
        } else {
            this.system.accessRole = this.system.info.accessRole;
            if (this.system.isMine) {
                this.system.permissions.editUsers = true;
                this.system.permissions.editAdmins = true;
                this.system.permissions.isAdmin = true;
            } else {
                this.system.permissions.editUsers = this.system.info.accessRole.indexOf(this.CONFIG.accessRoles.editUserAccessRoleFlag) >= 0;
                this.system.permissions.isAdmin = this.system.info.accessRole.indexOf(this.CONFIG.accessRoles.globalAdminAccessRoleFlag) >= 0;
            }
        }
    }

    getInfoAndPermissions() {
        return this.systemsService.getSystemAsPromise(this.system.id).then((system) => {
            const error = this.cloudApi.checkResponseHasError(system);
            if (error) {
                return Promise.reject(error);
            }

            if (!system) {
                return Promise.reject({ data: { resultCode: 'forbidden' } });
            }
            if (this.system.info) {
                _.extend(this.system.info, system); // Update
            } else {
                this.system.info = system;
            }

            this.system.isOnline = this.system.info.stateOfHealth === this.CONFIG.systemStatuses.onlineStatus;
            this.system.isMine = this.system.info.ownerAccountEmail === this.currentUserEmail;
            this.system.canMerge = this.system.isMine && (this.system.info.capabilities && this.system.info.capabilities.indexOf(this.CONFIG.systemCapabilities.cloudMerge) > -1);
            this.system.mergeInfo = system.mergeInfo;

            this.checkPermissions();

            return this.system.info;
        });
    }

    getInfo(force?) {
        if (force) {
            this.infoPromise = undefined;
        }
        if (!this.infoPromise) {
            this.infoPromise = Promise.all([
                this.updateSystemAuth(),
                this.getInfoAndPermissions()
            ]);
        }
        return this.infoPromise;
    }

    getUsersCachedInCloud() {
        this.system.isAvailable = false;
        this.updateSystemState();
        return this.cloudApi.users(this.system.id).toPromise().then((data: any) => {
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
        return user.isAdmin || user.email === this.system.info.ownerAccountEmail;
    }

    isAdmin(user) {
        return user.permissions && user.permissions.indexOf(this.CONFIG.accessRoles.globalAdminPermissionFlag) >= 0;
    }

    updateAccessRoles() {
        if (!this.system.accessRoles) {
            const userRolesList = this.system.userRoles.map((userRole) => {
                return {
                    name: userRole.name,
                    userRoleId: userRole.id,
                    userRole
                };
            });
            this.system.accessRoles = Array.from(new Set([...this.predefinedRoles, ...userRolesList]));
            this.system.accessRoles.push(this.CONFIG.accessRoles.customPermission);
        }
        return this.system.accessRoles;
    }

    findAccessRole(user) {
        if (!user.isEnabled) {
            return { name: 'Disabled' };
        }
        const roles = this.system.accessRoles || this.CONFIG.accessRoles.predefinedRoles;
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
            this.system.userRoles = userRoles;
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
                console.error('Aggregated request to server has failed', result);
                return Promise.reject();
            }
            const data = result.reply;
            const usersList = data['ec2/getUsers'];
            const userRoles = data['ec2/getUserRoles'];
            const predefinedRoles = data['ec2/getPredefinedRoles'];
            this.system.isAvailable = true;
            this.updateSystemState();
            return processUsers(usersList, userRoles, predefinedRoles);
        }, () => {
            this.system.isAvailable = false;
            this.updateSystemState();
            return;
        });
    }

    getUsers(reload?) {
        if (!this.usersPromise || reload) {
            let promise;
            if (this.system.isOnline) { // Two separate cases - either we get info from the system (presuming it has actual names)
                promise = this.getUsersDataFromTheSystem().catch(() => {
                    return this.getUsersCachedInCloud();
                });
            } else { // or we get old cached data from the cloud
                promise = this.getUsersCachedInCloud();
            }

            this.usersPromise = promise.then((users) => {
                if (false && !Array.isArray(users)) {
                    return false;
                }
                // Sort users here
                this.system.users = users.map((user) => {
                    const isMe = user.email === this.currentUserEmail;
                    const isOwner = this.isOwner(user);
                    const isAdmin = this.isAdmin(user);

                    if (user.accountFullName && !user.fullName) {
                        user.fullName = user.accountFullName;
                    }
                    user.role = this.findAccessRole(user);
                    user.accessRole = user.role.name;
                    user.id = user.id || user.accountId;
                    user.canBeDeleted = !isOwner && (!isAdmin || this.system.isMine);
                    user.canBeEdited = !isOwner && !isMe && (!isAdmin || this.system.isMine) && user.isEnabled;

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
                this.systemSubject.next(this.system);
                return this.system.users;
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

            let existingUser = this.system.users.find((u) => {
                return user.email === u.email;
            });
            if (!existingUser) { // user not found - create a new one
                existingUser = this.mediaserver.userObject(user.fullName, user.email);
                this.system.users.push(existingUser);
            }
            user = existingUser;

            if (!user.canBeEdited && !this.system.isMine) {
                return Promise.reject({ resultCode: 'cantEditAdmin' });
            }
        }

        user.userRoleId = role.userRoleId || '';
        user.permissions = role.permissions || '';

        // TODO: remove later
        // this.cloudApi.share(this.system.id, user.email, accessRole);

        return this.mediaserver.saveUser(user).toPromise().then((result) => {
            user.role = role;
            user.accessRole = accessRole;
        });
    }

    deleteUser(removedUser) {
        return this.mediaserver.deleteUser(removedUser.id).toPromise().then(() => {
            this.system.users = this.system.users.filter((user) => user !== removedUser);
        });
    }

    deleteFromCurrentAccount() {
        if (this.currentUser && this.system.isAvailable) {
            this.mediaserver.deleteUser(this.currentUser.id); // Try to remove me from the system directly
        }
        return this.cloudApi.unshare(this.system.id, this.currentUserEmail).toPromise().then(() => {
            delete this.systems[this.system.id];
        }); // Anyway - send another request to cloud_db to remove my this
    }

    update() {
        if (this.system === undefined) {
            return;
        }
        this.infoPromise = undefined; // Clear cache
        return this.getInfo().then(() => {
            if (this.usersPromise) {
                this.usersPromise = undefined;
                if (this.system.permissions.editUsers) {
                    return this.getUsers().then(() => {
                        return this.system;
                    });
                }
            }
            return this.system;
        });
    }

    startPoll() {
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        if (this.auth) {
            this.activeSubscription = this.systemPoll.subscribe((system) => {
                this.update();
                this.systemSubject.next(this.system);
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
        this.auth = false;
        this.system = undefined;
        this.systemSubject = new ReplaySubject(0);
    }

    // Temporary fix will investigate when I get back
    update2() {
        return from(this.getInfo()).pipe(
            tap(() => {
                if (this.system.permissions.editUsers) {
                    from(this.getUsers()).subscribe(() => {});
                }
            })
        );
    }
}
