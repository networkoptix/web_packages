import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, Inject, signal, ViewChild } from '@angular/core';
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
import { ToastType } from '@components/toast-container/toast.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { ChangedIdReturned } from '@services/system-api.types';
import { AddUser, Role } from '@services/system-user.types';
import { NxToastService } from '@services/toast.service';
import { transitionEnter, transitionLeave } from '@variables/animations';

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
        NxMultiSelectDropdown,
        NxAsyncActionButtonComponent,
    ],
    animations: [transitionEnter, transitionLeave],
})
export class AddUserModalContent extends ModalBase<DT['return']> {
    @ViewChild('addUserForm') private form: NgForm;

    LANG = staticLang;
    CONFIG: IConfig = nxConfig;

    // To enable reusable animations to a dialog, add the following line
    @HostBinding('@.disabled') enableAnimations = this.CONFIG.featureFlags.enableAnimations;

    hideErrors: boolean = true;
    systemName: string;
    user: AddUser;
    selectedPermissionSubject = new BehaviorSubject<Role>({
        id: '',
        isOwner: false,
        name: '',
        permissions: '',
    });
    accessDescription: string;
    useGroups$$ = signal<boolean>(false);
    groups: MultiSelectItem[];

    addUserAction = createAsyncAction({
        action: () => {
            this.hideErrors = false;
            const userExists = this.system.userManager.users.some(item => {
                return item.email === this.user.email;
            });
            if (userExists) {
                return Promise.reject('alreadyExists');
            } else {
                return this.saveUser();
            }
        },
        success: user => {
            this.hideErrors = true;
            this.close(user.id);
        },
        error: (err: 'alreadyExists' | unknown) => {
            if (err === 'alreadyExists') {
                this.form.controls.addUserDialogEmail.setErrors({ alreadyExists: true });
            } else {
                // User cancelled session expired dialog
                this.toastService.notify(
                    this.LANG.dialogs.updateSession.addUser,
                    ToastType.Warning,
                );
            }
        },
        postError: () => {
            this.self.nativeElement.querySelector('input')?.focus();
        },
    });

    constructor(
        configService: NxConfigService,
        private toastService: NxToastService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
        private self: ElementRef<HTMLElement>,
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
            this.accessDescription = this.system.userManager.groups.find(
                ({ id }) => id === gid,
            )?.tooltip;
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
        this.useGroups$$.set(this.system.version > 5.1);

        if (this.useGroups$$()) {
            const groups = this.system.userManager.groups;
            this.groups = this.removeLdapGroups([...groups]);
        }

        const defaultRole = this.system.userManager.accessRoles.find(
            role => role.name === this.CONFIG.accessRoles.default,
        );

        this.user = {
            email: '',
            isEnabled: true,
            isCloud: true,
            role: this.useGroups$$() ? undefined : defaultRole,
            groupIds: [],
        };
        this.setPermission(this.user.role);
    }

    protected readonly DATA_TYPE = DATA_TYPE;
}
