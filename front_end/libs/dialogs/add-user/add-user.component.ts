import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { NxMultiSelectDropdown } from '@components/dropdowns/multi-select/multi-select.component';
import {
    DATA_TYPE,
    MultiSelectItem,
} from '@components/dropdowns/multi-select/multi-select.component.types';
import { NxPermissionsDropdown } from '@components/dropdowns/permissions/permissions.component';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxMultiLineEllipsisClampComponent } from '@components/multi-line-ellipsis-clamp/mle-clamp.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { ChangedIdReturned } from '@services/system-api.types';
import { AddUser, Role } from '@services/system-user.types';
import { UserWithGroupsManager } from '@services/system.service/user-manager/user-with-groups-manager';
import { NxToastService } from '@services/toast.service';

import type { AddUser as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxEmailComponent,
        NxPermissionsDropdown,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxMultiSelectDropdown,
        NxMultiLineEllipsisClampComponent,
    ],
})
export class AddUserModalContent extends ModalBase<DT['return']> {
    @ViewChild('addUserForm') private form: NgForm;

    LANG = staticLang;
    CONFIG: IConfig;

    accessRoles: Role[];
    hideErrors: boolean = true;
    systemName: string;
    addUser: Process;
    user: AddUser;
    selectedPermissionSubject = new BehaviorSubject<Role>({
        id: '',
        isOwner: false,
        name: '',
        permissions: '',
    });
    accessDescription: string;
    useGroups: boolean = false;
    groups: MultiSelectItem[];

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
        this.CONFIG = configService.getConfig();
    }

    get selectedPermission(): Role {
        return this.selectedPermissionSubject.getValue();
    }

    set selectedPermission(role: Role) {
        this.user.role = role;
        this.selectedPermissionSubject.next(role);
    }

    private getAccessDescription(): string {
        const name = this.selectedPermission?.name;
        return (
            (name && this.LANG.accessRoles[name] && this.LANG.accessRoles[name].description) ||
            this.LANG.accessRoles.customRole.description
        );
    }

    preSubmit = (): void => {
        this.hideErrors = false;
    };

    setGroupDescription(gids: string[]): void {
        if (gids.length === 1) {
            const gid = gids[0];
            this.accessDescription = this.system.userManager.groups.find(({ id }) => id === gid)
                ?.tooltip;
        } else {
            this.accessDescription = '';
        }
    }

    setPermission(role: Role): void {
        this.selectedPermission = role;
        this.accessDescription = this.getAccessDescription();
    }

    private saveUser(): Promise<ChangedIdReturned> {
        this.user.email = this.user.email.toLowerCase();
        // this.user.userGroupIds.push(this.userGroupIds);
        return this.system.userManager
            .addUser(this.user)
            .then(user => this.system.getUsers(true).then(() => user));
    }

    private removeLdapGroups(groups: MultiSelectItem[]): MultiSelectItem[] {
        const { ldapUserGroupText } = this.LANG.dialogs.titles;
        const ldapIndex = groups.findIndex(({ label }) => label === ldapUserGroupText);
        if (ldapIndex === -1) {
            return groups;
        }

        return groups.splice(0, ldapIndex - 1);
    }

    ngOnInit(): void {
        this.systemName = this.system.info.systemName || this.system.info.name;
        this.useGroups = this.system.version > 5.1;

        if (this.useGroups) {
            const userManager = this.system.userManager as UserWithGroupsManager;
            const isOwner = this.system.permissionManager.isOwner$$();
            const groups = userManager.groups;
            this.groups = this.removeLdapGroups(
                groups.filter(group => isOwner || !userManager.isGroupPowerUser(group)),
            );
        }

        this.accessRoles = [...this.system.userManager.accessRoles];

        const defaultRole = this.accessRoles.find(
            role => role.name === this.CONFIG.accessRoles.default,
        );

        this.user = {
            email: '',
            isEnabled: true,
            isCloud: true,
            role: this.useGroups ? undefined : defaultRole,
            groupIds: [],
        };

        this.setPermission(this.user.role);

        this.addUser = this.processService.createProcess(
            () => {
                this.lock();
                this.hideErrors = false;
                const userExists = this.system.userManager.users.some(item => {
                    return item.email === this.user.email;
                });
                if (userExists) {
                    return Promise.reject({ resultCode: 'alreadyExists' });
                } else {
                    return this.saveUser();
                }
            },
            {
                errorCodes: {
                    alreadyExists: () => {
                        this.form.controls.addUserDialogEmail.setErrors({ alreadyExists: true });
                    },
                    cantEditAdmin: () => {
                        this.form.controls.addUserDialogEmail.setErrors({ cantEditAdmin: true });
                    },
                },
                ignoreError: true,
            },
            user => {
                this.hideErrors = true;
                this.close(user.id);
            },
            () => {
                this.toastService.notify(
                    this.LANG.dialogs.updateSession.addUser,
                    ToastType.Warning,
                );
                this.unlock();
            },
        );
    }

    protected readonly DATA_TYPE = DATA_TYPE;
}
