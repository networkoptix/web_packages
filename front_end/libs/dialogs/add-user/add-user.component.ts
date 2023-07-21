import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxPermissionsDropdown } from '@components/dropdowns/permissions/permissions.component';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { ModalBase } from '@dialogs/modal-base';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { ChangedIdReturned } from '@services/system-api.types';
import type {
    NewUserBase,
    NxAccessRole,
} from '@services/system.service/user-manager/user-manager-types';
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
    ],
})
export class AddUserModalContent extends ModalBase<DT['return']> {
    @ViewChild('addUserForm') private form: NgForm;

    LANG = staticLang;
    CONFIG: IConfig;

    hideErrors: boolean = true;
    systemName: string;
    addUser: Process;
    user: NewUserBase;
    selectedPermissionSubject = new BehaviorSubject<NxAccessRole>({
        name: '',
        permissions: '',
    });
    accessDescription: string;

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

    get selectedPermission(): NxAccessRole {
        return this.selectedPermissionSubject.getValue();
    }

    set selectedPermission(role: NxAccessRole) {
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

    setPermission(role: NxAccessRole): void {
        this.selectedPermission = role;
        this.accessDescription = this.getAccessDescription();
    }

    private saveUser(): Promise<ChangedIdReturned> {
        this.user.email = this.user.email.toLowerCase();
        // this.user.userGroupIds.push(this.userGroupIds);
        return this.system.userManager
            .saveUser(this.user)
            .then(user => this.system.getUsers(true).then(() => user));
    }

    ngOnInit(): void {
        this.systemName = this.system.info.systemName || this.system.info.name;

        const defaultRole = this.system.userManager.accessRoles.find(
            role => role.name === this.CONFIG.accessRoles.default,
        );

        this.user = {
            email: '',
            isEnabled: true,
            isCloud: true,
            role: defaultRole,
        };
        this.setPermission(defaultRole);

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
                        this.form.controls.addUserEmail.setErrors({ alreadyExists: true });
                    },
                    cantEditAdmin: () => {
                        this.form.controls.addUserEmail.setErrors({ cantEditAdmin: true });
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
}
