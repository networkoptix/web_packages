import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { servers } from '@lib/variables/static-variables';
import { NxLoginService } from '@services/login.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';

import type { AddUser as DialogTypes } from '../dialogs.types';

@Component({
    selector: 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls: []
})
export class AddUserModalContent {
    @ViewChild('addUserForm') private form: NgForm;

    LANG = staticLang;
    CONFIG: IConfig;

    hideErrors: boolean = true;
    systemName: string;
    addUser: Process;
    needsUpdate: boolean;
    user;
    selectedPermissionSubject = new BehaviorSubject<any>({ name: '' });
    accessDescription: string;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private loginService: NxLoginService,
        public dialogRef: DialogRef<DialogTypes['return']>,
        @Inject(DIALOG_DATA) public system: DialogTypes['data'],
    ) {
        this.CONFIG = configService.getConfig();
    }

    get selectedPermission() {
        return this.selectedPermissionSubject.getValue();
    }

    set selectedPermission(role) {
        this.user.role = role;
        this.selectedPermissionSubject.next(role);
    }

    private getAccessDescription(): string {
        if (this.LANG.accessRoles[this.selectedPermission.name]) {
            return this.LANG.accessRoles[this.selectedPermission.name].description;
        } else {
            return this.LANG.accessRoles.customRole.description;
        }
    }

    preSubmit = (): void => {
        this.hideErrors = false;
    };

    setPermission(role): void {
        this.selectedPermission = role;
        this.accessDescription = this.getAccessDescription();
    }

    private saveUser(): Promise<NxSystemUser> {
        this.user.email = this.user.email.toLowerCase();
        // this.user.userGroupIds.push(this.userGroupIds);
        return this.system.userManager.saveUser(this.user, this.user.role)
            .then(user => this.system.getUsers(true).then(() => user));
    }

    ngOnInit(): void {
        this.systemName = this.system.info.systemName || this.system.info.name;

        const defaultRole = this.system.userManager.accessRoles.find(role =>
            role.name === this.CONFIG.accessRoles.default
        );

        this.user = {
            email: '',
            isEnabled: true,
            isCloud: true,
            role: defaultRole
        };
        this.setPermission(defaultRole);

        this.addUser = this.processService.createProcess(() => {
            this.dialogRef.disableClose = true;
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
                }
            },
            ignoreError: true
        },
        user => {
            this.hideErrors = true;
            this.close(user.id);
            this.unlock();
        },
        err => {
            this.unlock();
            if (err?.resultCode === 'alreadyExists') {
                return;
            }
            if (
                err.errorId ===
                servers.errors.oldSessionErrorId
            ) {
                this.needsUpdate = true;
                this.loginService.currentSystem = this.system;
                this.loginService.updateSession('renewWeb')
                    .then(ready => {
                        this.needsUpdate = !ready;
                        if (ready) {
                            this.addUser.run();
                        }
                    });
            }
        });
    }

    close = (msg?: DialogTypes['return']): void => {
        this.dialogRef.close(msg);
    };

    unlock = (): void => {
        this.dialogRef.disableClose = false;
    };
}
