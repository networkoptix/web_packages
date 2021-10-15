import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject }             from 'rxjs';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxSystemRole }              from '@services/system.service';

@Component({
    selector: 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls: []
})
export class AddUserModalContent {
    @Input() system;
    @Input() closable;
    @ViewChild('addUserForm') form;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    hideErrors: boolean = true;
    alreadyExists: string;
    addUser: Process;
    user;
    selectedPermissionSubject = new BehaviorSubject<any>({ name: '' });
    accessDescription: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
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

    private getRoleDescription() {
        let description;
        if (this.selectedPermission.description) {
            description = this.selectedPermission.description;
        } else if (this.selectedPermission.userRoleId) {
            description = this.LANG.accessRoles.customRole.description?.();
        } else if (this.LANG.accessRoles[this.selectedPermission.name]) {
            description = this.LANG.accessRoles[this.selectedPermission.name].description?.();
        } else {
            description = this.LANG.accessRoles.customRole.description?.();
        }

        return (typeof description === 'function') ? description() : description;
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

    preSubmit = () => {
        this.hideErrors = false;
    }

    setPermission(role: NxSystemRole) {
        this.selectedPermission = role;
        this.accessDescription = this.getAccessDescription();
    }

    saveUser() {
        return this.system.saveUser(this.user, this.user.role)
            .then(user => {
                return this.system.getUsers(true)
                    .then(() => user);
            });
    }

    ngOnInit() {
        this.alreadyExists = this.LANG.dialogs.addUser.alreadyExists().replace('%systemName%', this.system.info.systemName || this.system.info.name);
        this.user = {
            email: '',
            isEnabled: true,
            isCloud: true,
            role: {
                name: this.CONFIG.accessRoles.default,
                permissions: ''
            }
        };
        this.accessDescription = this.getRoleDescription();

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
        })
            .then((user) => {
                if (user) {
                    this.hideErrors = true;
                    this.activeModal.close(user.id);
                }
            });
    }
}
