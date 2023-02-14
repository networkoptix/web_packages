import {
    Component, Inject,
    Input,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxLoginService } from '@services/login.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls: []
})
export class AddUserModalContent {
    @Input() closable = true;
    @ViewChild('addUserForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    hideErrors: boolean = true;
    alreadyExists: string;
    addUser: Process;
    needsUpdate: boolean;
    user;
    selectedPermissionSubject = new BehaviorSubject<any>({ name: '' });
    accessDescription: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    get selectedPermission() {
        return this.selectedPermissionSubject.getValue();
    }

    set selectedPermission(role) {
        this.user.role = role;
        this.selectedPermissionSubject.next(role);
    }

    private getAccessDescription() {
        let description;
        if (this.LANG.accessRoles[this.selectedPermission.name]) {
            description = this.LANG.accessRoles[this.selectedPermission.name].description?.();
        } else {
            description = this.LANG.accessRoles.customRole.description?.();
        }

        return (typeof description === 'function') ? description() : description;
    }

    preSubmit = (): void => {
        this.hideErrors = false;
    };

    setPermission(role): void {
        this.selectedPermission = role;
        this.accessDescription = this.getAccessDescription();
    }

    saveUser() {
        this.user.email = this.user.email.toLowerCase();
        return this.system.saveUser(this.user, this.user.role)
            .then(user => {
                return this.system.getUsers(true)
                    .then(() => user);
            });
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);

        this.alreadyExists = this.LANG.dialogs.addUser.alreadyExists()
            .replace(
                '%systemName%',
                this.system.info.systemName || this.system.info.name
            );

        const defaultRole = this.system.accessRoles.find(role =>
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
            this.hideErrors = false;
            const userExists: boolean = this.system.users.some(item => {
                return item.email === this.user.email;
            });
            if (userExists) {
                this.form.controls.addUserEmail.setErrors({ alreadyExists: true });
                return Promise.resolve();
            } else {
                return this.saveUser();
            }
        },
        {
            ignoreError: true
        },
        user => {
            if (user) {
                this.hideErrors = true;
                this.close(user.id);
            }
        }, err => {
            if (
                err.errorId ===
                    this.CONFIG.servers.errors.oldSessionErrorId
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

    close = (msg?: string): void => {
        this.dialogRef.close(msg);
    };
}
