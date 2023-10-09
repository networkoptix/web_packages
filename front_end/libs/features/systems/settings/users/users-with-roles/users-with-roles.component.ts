import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxSystemUsersBaseComponent } from '@pages/systems/settings/users/edit-user-base/edit-user-base.component';
import { NxUser } from '@services/system-user.types';
import { NxFormBuilder, NxFormControl, NxFormGroup } from '@utils/reactive-form-builder';

interface UserRoleFormControls {
    email: NxFormControl<string>;
    isEnabled: NxFormControl<boolean>;
    fullName: NxFormControl<string>;
    role: NxFormControl<string>;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-with-roles-component',
    templateUrl: 'users-with-roles.component.html',
    styleUrls: ['users-with-roles.component.scss'],
})
export class NxSystemUsersWithRolesComponent extends NxSystemUsersBaseComponent {
    accessDescription: string;
    userRoleForm: NxFormGroup<UserRoleFormControls>;

    resetForm = (): void => {
        if (this.userRoleForm) {
            this.userRoleForm.reset();
        }
    };

    protected changeUser(user: NxUser): void {
        this.setPermission();
        this.removeOldForm$.next(true);

        if (this.userRoleForm) {
            this.userRoleForm = undefined;
            this.formIsNotDirty.emit(true);
        }
        this.role = !this.isCloud$$() && user.name === 'admin' ? 'Owner' : user.role.name;

        this.userRoleForm = NxFormBuilder<UserRoleFormControls>({
            email: {
                value: user.email,
                disabled: !this.editPermissions$$().changeInfo || !this.isLdap$$(),
            },
            isEnabled: {
                value: user.isEnabled,
                disabled: !this.editPermissions$$().enable,
            },
            fullName: {
                value: user.fullName,
                disabled: !this.editPermissions$$().changeInfo || !this.isLdap$$(),
            },
            role: {
                value: this.selectedUser.role,
                disabled: !this.systemAvailable || !this.editPermissions$$().changePermissions,
            },
        });
        this.userRoleForm.valueChanges
            .pipe(debounceTime(100), takeUntil(this.removeOldForm$))
            .subscribe(values => {
                this.setPermission();
                this.formIsNotDirty.emit(!this.userRoleForm.dirty);
            });
    }

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(
            async () => {
                await this.checkIfEditable();
                const user = Object.assign(
                    this.formatUser(this.selectedUser),
                    this.userRoleForm.getRawValue(),
                );
                this.locked.add(user.email);
                try {
                    await this.system.userManager.saveUser(user);
                    return this.system.getUsers(true);
                } catch (err) {
                    return Promise.reject(err);
                } finally {
                    this.locked.delete(user.email);
                }
            },
            {
                ignoreError: true,
            },
            () => {
                this.userRoleForm.freeze();
            },
            () => {
                this.showUserChangeFailedToast();
            },
        );
    }

    public setPermission(): void {
        const userRole = this.selectedUser.role?.name ?? this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description
            : this.LANG.accessRoles.customRole.description;

        this.role = this.selectedUser.role.name;
    }
}
