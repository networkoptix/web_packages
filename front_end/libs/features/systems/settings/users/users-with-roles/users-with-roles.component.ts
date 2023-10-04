import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxSystemUsersBaseComponent } from '@pages/systems/settings/users/edit-user-base/edit-user-base.component';
import { NxUser, Role } from '@services/system-user.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-with-roles-component',
    templateUrl: 'users-with-roles.component.html',
    styleUrls: ['users-with-roles.component.scss'],
})
export class NxSystemUsersWithRolesComponent extends NxSystemUsersBaseComponent {
    accessDescription: string;

    @ViewChild('userRoleForm', { read: NgForm }) private userRoleForm: NgForm;
    protected changeUser(user: NxUser): void {
        this.applyService.resetFormWatchers();
        this.setPermission(user.role);
        this.role = !this.isCloud$$() && user.name === 'admin' ? 'Owner' : user.role.name;

        setTimeout(() => {
            this.applyService.createFormWatcher(
                'userEnabledForm',
                this.userEnabledForm,
                this.editUser,
            );

            if (user.canBeEdited) {
                this.applyService.createFormWatcher(
                    'userRoleForm',
                    this.userRoleForm,
                    this.editUser,
                );
            }

            if (user.type !== this.UserType.cloud) {
                this.applyService.createFormWatcher(
                    'userSettingsForm',
                    this.userSettingsForm,
                    this.editUser,
                );
            }
        });
    }

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(
            async () => {
                await this.checkIfEditable();
                const user = this.formatUser(this.selectedUser);
                this.locked.add(user.email);
                try {
                    await this.system.userManager.saveUser(user);
                    await this.system.getUsers(true).catch(err => console.error(err));
                } catch (err) {
                    this.showUserChangeFailedToast();
                } finally {
                    this.locked.delete(user.email);
                }
            },
            {
                ignoreError: true,
            },
            undefined,
            () => {}, // Added to suppress the default logging in processes
        );
    }

    public setPermission(role: Role): void {
        this.selectedUser.role = { ...role };
        const userRole = this.selectedUser.role?.name ?? this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description
            : this.LANG.accessRoles.customRole.description;

        this.role = this.selectedUser.role.name;
    }
}
