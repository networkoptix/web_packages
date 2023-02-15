import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import type {
    ec2User,
    ChangedIdReturned,
    ec2AccessRight,
    ec2PredefinedRole,
    ec2UserRole,
} from '@services/system-api.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';

import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystemRestAPI } from '../../system-rest-api.service';

import type {
    NxAccessRole,
    SystemPermissions,
    PredefinedRole,
    NxUserRole,
    NxUser,
    NewUserBase,
    NxEc2LocalUser,
    NewUserData,
    UserRole,
    NxEc2UserPwChange,
    PreprocessCloudUser,
} from './user-manager-types';

export class UserManager {
    protected _ownerEmail: string = '';
    private _accessRole: string = '';
    accessRoles: NxAccessRole[];
    currentUser: NxUser;
    isMine: boolean = false;
    permissions: SystemPermissions = {
        editAdmins: false,
        editUsers: false,
        isAdmin: false,
        editCameras: false,
        viewArchives: false,
    };
    users: NxUser[];

    constructor(
        protected CONFIG: IConfig,
        protected mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2,
        public currentUserEmail: string,
        private userId: string,
        protected locale: string,
    ) {
        this.accessRoles = this.CONFIG.accessRoles.predefinedRoles;
    }

    get accessRole(): string {
        return this._accessRole;
    }

    set accessRole(accessRole: string) {
        this._accessRole = accessRole || '';
        this.checkPermissions();
    }

    set ownerEmail(email: string) {
        this._ownerEmail = email;
        this.isMine = (email && this.currentUserEmail === email) ||
            this.currentUser?.isLocalOwner;
        this.onOwnerEmailUpdate();
    }

    get currentOwner(): NxUser {
        return this.users.find(user => user.isCloudOwner);
    }

    canViewInfo(): boolean {
        return this.permissions.isAdmin;
    }

    nonOwners({ cloud, local }: { cloud?: boolean; local?: boolean }): NxUser[] {
        return this.users.filter(user => {
            if (user.isCloud && cloud) {
                return !user.isCloudOwner;
            } else if (!user.isCloud && local) {
                return !user.isLocalOwner;
            } else {
                return false;
            }
        });
    }

    protected isAdmin(userOrRole: { permissions: string }): boolean {
        return userOrRole.permissions?.includes(
            this.CONFIG.accessRoles.globalAdminPermissionFlag
        );
    }

    isOwner(user: ec2User | PreprocessCloudUser | NxUser): boolean {
        if (user === undefined) {
            return;
        }
        return (user as NxUser).isLocalOwner ||
            user.isCloud && user.email === this._ownerEmail;
    }

    checkPermissions(): void {
        const isMine = this.isMine || !!this.currentUser?.isLocalOwner;
        let isAdmin = isMine ||
            this.CONFIG.accessRoles.adminAccess.includes(this._accessRole.toLowerCase());
        if (!isAdmin && this.currentUser) {
            isAdmin = this.isAdmin(this.currentUser);
        }
        const permissions: SystemPermissions = {
            editAdmins: isMine,
            editUsers: isAdmin,
            isAdmin,
            editCameras: isAdmin,
            viewArchives: isAdmin
        };

        if (!isAdmin && this.currentUser) {
            permissions.editUsers = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.editUserPermissionFlag
            );
            permissions.editCameras = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.editCameraPermissionFlag
            );
            permissions.viewArchives = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.viewArchivesPermissionFlag
            );
        }

        this.permissions = permissions;
    }

    deleteUser(removedUser: Pick<NxUser, 'id'>): Promise<void> {
        return this.mediaserver.deleteUser(removedUser.id).toPromise()
            .then(data => {
                if (!data) {
                    data = removedUser;
                }
                this.users = this.users.filter(user => {
                    return user.id !== data.id;
                });
            });
    }

    private getUserRole(user: ec2User | PreprocessCloudUser | NxUser): NxUserRole {
        const roles = this.accessRoles;
        let role = roles.find(role => {
            // Owner flag has top priority and overrides everything
            if ((role as PredefinedRole).isOwner) {
                return this.isOwner(user);
            }
            if (
                'id' in role &&
                role.id !== '{00000000-0000-0000-0000-000000000000}'
            ) {
                return role.id === user.userRoleId;
            }

            // Admins has second priority
            if (this.isAdmin(role)) {
                return this.isAdmin(user);
            }
            return role.permissions === user.permissions;
        });
        // handles the Custom role
        if (!role) {
            role = {
                ...roles[roles.length - 1],
                isAdmin: this.isAdmin(user),
                permissions: user.permissions
            };
        }

        return role as NxUserRole;
    }

    getUsersDataFromTheSystem(): Promise<void> {
        return this.mediaserver.getAggregatedUsersData().toPromise().then(result => {
            if (!result) {
                return Promise.reject(`Aggregated request to server has failed ${result}`);
            }
            const data = result.reply;
            const users = data['ec2/getUsers'];
            const userRoles = data['ec2/getUserRoles'];
            const predefinedRoles = data['ec2/getPredefinedRoles'];
            const accessRights = data['ec2/getAccessRights'];
            return new Promise(resolve => {
                this.updateAccessRoles(predefinedRoles, userRoles);
                this.processUsers(users, accessRights);
                resolve();
            });
        }, () => {
            return Promise.reject('Media server cloud not be reached.');
        });
    }

    // e.g. GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalUserInputPermission
    normalizePermissionString(permissions: string): string {
        return Array.from(new Set(permissions.split('|').sort())).join('|');
    }

    processUsers(
        users: ec2User[] | PreprocessCloudUser[],
        accessRightsList: ec2AccessRight[] = []
    ): void {
        // accessRights if individual camera permissions ever set
        const accessRightsByUser: Record<string, string[]> = Object.fromEntries(
            accessRightsList.map(ar => [ar.userId, ar.resourceIds])
        );
        const processed = users.map<NxUser>((user: ec2User | PreprocessCloudUser) => {
            const fullName = 'fullName' in user ? user.fullName : user.accountFullName;
            user.permissions = this.normalizePermissionString(user.permissions);
            const role = this.getUserRole(user);
            // Update default permissions with role permissions
            user.permissions = this.normalizePermissionString(
                [user.permissions, role.permissions].join('|')
            );
            const accessRole = role.name;
            // allMediaPermissionFlag exists if the all camera permission option selected
            const id = 'id' in user ? user.id : user.accountId;
            let accessRights: Record<string, true>;
            if (
                !user.permissions.includes(
                    this.CONFIG.accessRoles.allMediaPermissionFlag
                ) &&
                accessRightsByUser[id]
            ) {
                accessRights = Object.fromEntries(
                    accessRightsByUser[id].map(rId => [rId, true])
                );
            }
            const isCloudOwner = this.isOwner(user);
            const isMe = !environment.isLocal
                ? user.isCloud && user.email === this.currentUserEmail
                : id === this.userId;
            const isAdmin = this.isAdmin(user);
            const isLocalOwner = !user.isCloud && (user as ec2User).name === 'admin';
            const canBeEdited = this.canBeEdited({
                isMe,
                isLocalOwner,
                isCloudOwner,
                isAdmin,
            });

            const processedUser = {
                ...user,
                fullName,
                role,
                accessRole,
                accessRights,
                id,
                isCloudOwner,
                isMe,
                isAdmin,
                isLocalOwner,
                canBeEdited,
            };

            if (isMe) {
                this.currentUser = processedUser;
                this.accessRole = processedUser.accessRole;
            }

            return processedUser;
        });

        this.users = processed.sort((a, b) => {
            if (a.isCloud && b.isCloud) {
                return a.email.localeCompare(b.email, this.locale);
            } else if (!a.isCloud && !b.isCloud) {
                return (a as NxEc2LocalUser).name.localeCompare(
                    (b as NxEc2LocalUser).name,
                    this.locale
                );
            } else {
                return a.isCloud ? 1 : -1;
            }
        });
    }

    /** Reduced version of .processUsers() for when owner email is changed */
    private onOwnerEmailUpdate(): void {
        this.users = this.users?.map(user => {
            user.permissions = this.normalizePermissionString(user.permissions);
            user.role = this.getUserRole(user);
            user.permissions = this.normalizePermissionString(
                [user.permissions, user.role.permissions].join('|')
            );
            user.accessRole = user.role.name;
            user.isCloudOwner = this.isOwner(user);
            user.isAdmin = this.isAdmin(user);
            user.canBeEdited = this.canBeEdited(user);
            if (user.isMe) {
                this.currentUser = user;
                this.accessRole = user.accessRole;
            }
            return user;
        });
    }

    protected canBeEdited(user: {
        isMe: boolean;
        isLocalOwner: boolean;
        isCloudOwner: boolean;
        isAdmin: boolean;
    }): boolean {
        /**
         * User can not be edited if:
         * - this user is the current user
         * - this user is the local owner (local 'admin')
         * - this user is the cloud owner
         *
         * Furthermore, if the system is not mine and the user is an admin,
         *   they also can not be edited
         */
        // const amIAdmin = this.system.userManager.currentUser.isAdmin;
        // const isNotMeOrOwner = !(user.isMe || user.isLocalOwner || user.isCloudOwner);
        // this.selectedUser.canBeEdited = isNotMeOrOwner && amIAdmin;

        const isNotMeOrOwner = !(user.isMe || user.isLocalOwner || user.isCloudOwner);
        return isNotMeOrOwner && (this.isMine || !user.isAdmin);
    }

    saveUser(user: NxEc2LocalUser | NxEc2UserPwChange | NewUserBase): Promise<ChangedIdReturned> {
        const isSelf = (user as NxEc2LocalUser).id === this.currentUser.id;
        if (isSelf && user.isCloud) {
            return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
        }
        if (!isSelf && !(user as NxEc2LocalUser).canBeEdited && !this.isMine) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        let userData: NxEc2LocalUser | NewUserData;
        if ('id' in user) {
            // Modifying existing user
            userData = user;
            // The mediaserver doesn't like any attempts to change admin's permissions
            if (userData.isLocalOwner) {
                delete userData.name;
                delete userData.permissions;
            }
        } else {
            // Creating new user
            const { role, ...newUser } = user;
            userData = {
                ...newUser,
                canBeEdited: true,
                userRoleId: (role as UserRole).id ?? '{00000000-0000-0000-0000-000000000000}',
                permissions: role.permissions,
                name: user.email,
            };
        }

        const saveAction = userCreated && this.mediaserver.version === 5.1
            ? this.mediaserver.addUser(userData)
            : this.mediaserver.saveUser(userData);

        // Assuming highest version since all previous version properties are allowed
        return saveAction.toPromise();
    }

    private updateAccessRoles(
        ec2PredefinedRoles: ec2PredefinedRole[],
        ec2UserRoles: ec2UserRole[]
    ): NxAccessRole[] {
        const predefinedRoles = ec2PredefinedRoles.map(role => {
            return {
                ...role,
                isAdmin: this.isAdmin(role),
                permissions: this.normalizePermissionString(role.permissions)
            };
        });

        const userRolesList = ec2UserRoles.map(userRole => {
            return {
                ...userRole,
                isAdmin: this.isAdmin(userRole),
                permissions: this.normalizePermissionString(userRole.permissions)
            };
        });

        this.accessRoles = [
            ...predefinedRoles,
            ...userRolesList,
            this.CONFIG.accessRoles.customPermission
        ];
        return this.accessRoles;
    }
}
