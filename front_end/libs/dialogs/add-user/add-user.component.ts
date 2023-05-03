import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ModalBase } from '@dialogs/modal-base';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import { servers } from '@lib/variables/static-variables';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { ChangedIdReturned } from '@services/system-api.types';
import type {
    NewUserBase,
    NxAccessRole,
} from '@services/system.service/user-manager/user-manager-types';

import type { AddUser as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls: [],
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
        private dialogs: NxDialogsService,
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
        return name && this.LANG.accessRoles[name] &&
            this.LANG.accessRoles[name].description ||
            this.LANG.accessRoles.customRole.description;
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
            err => {
                if (err?.resultCode === 'alreadyExists') {
                    this.unlock();
                    return;
                } else if (err?.resultCode === 'cantEditAdmin') {
                    this.unlock();
                    return;
                }
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    this.dialogs
                        .updateSession({
                            sessionState: SessionState.RenewWeb,
                            system: this.system,
                            noConnectionMsg: this.LANG.dialogs.updateSession.addUser,
                            openingRef: this.dialogRef,
                        })
                        .then(ready => {
                            if (ready) {
                                this.addUser.run();
                            } else {
                                this.unlock();
                            }
                        });
                } else {
                    this.unlock();
                }
            },
        );
    }
}
