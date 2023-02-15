import {
    Component,
    ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { servers } from '@lib/variables/static-variables';
import { NxSystemUsersBaseComponent } from '@pages/systems/settings/users/edit-user-base/edit-user-base.component';
import type {
    NxEc2LocalUser,
    NxEc2User,
    NxUserRole,
    NxUser,
} from '@services/system.service/user-manager/user-manager-types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-with-roles-component',
    templateUrl: 'users-with-roles.component.html',
    styleUrls: ['users-with-roles.component.scss']
})

export class NxSystemUsersWithRolesComponent extends NxSystemUsersBaseComponent {
    accessDescription: string;

    @ViewChild('userRoleForm', { read: NgForm }) private userRoleForm: NgForm;

    get isLdap(): boolean {
        return (this.selectedUser as NxEc2User)?.isLdap;
    }

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(async () => {
            await this.checkIfEditable();
            const user = this.formatUser(this.selectedUser);
            this.locked.add(user.email);
            try {
                await this.system.userManager.saveUser(user);
                await this.system.getUsers(true).catch(err => console.error(err));
            } catch (err) {
                if (err?.error?.errorId === servers.errors.oldSessionErrorId) {
                    const ready = await this.dialogs.refreshSession(this.system);
                    if (ready) {
                        await this.system.userManager.saveUser(user);
                        await this.system.getUsers(true);
                    }
                } else {
                    this.showUserChangedToast();
                }
            } finally {
                this.locked.delete(user.email);
                this.setUser();
            }
        }, {
            ignoreError: true
        },
        undefined,
        () => {} // Added to suppress the default logging in processes
        );
    }

    protected setUser(): Promise<boolean | void> | void {
        if (this.system?.userManager?.users?.length) {
            this.locked.clear();

            let user: NxUser;
            if (this.paramUser) {
                user = this.findUser();
            }
            if (!user) {
                return this.routeToFirstUser();
            }

            this.applyService.resetFormWatchers();
            this.setUserHelper(user);
            this.setPermission(this.selectedUser.role);
            this.role = !user.isCloud && (user as NxEc2LocalUser).name === 'admin'
                ? 'Owner'
                : user.role.name;

            setTimeout(() => {
                this.applyService.createFormWatcher(
                    'userEnabledForm',
                    this.userEnabledForm,
                    this.editUser
                );

                if (this.selectedUser.canBeEdited) {
                    this.applyService.createFormWatcher(
                        'userRoleForm',
                        this.userRoleForm,
                        this.editUser
                    );
                }

                if (!this.selectedUser.isCloud) {
                    this.applyService.createFormWatcher(
                        'userSettingsForm',
                        this.userSettingsForm,
                        this.editUser
                    );
                }
            });
        }
    }

    public setPermission(role: NxUserRole): void {
        const userRole = role?.name ?? this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description
            : this.LANG.accessRoles.customRole.description;
        this.selectedUser.role = role;
        this.role = role.name;
    }
}
