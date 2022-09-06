import { Component, Input, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls: []
})
export class AddUserModalContent {
    @Input() system;
    @Input() closable;
    @ViewChild('addUserForm') form: NgForm;

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

    setPermission(role) {
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

    ngOnInit() {
        this.alreadyExists = this.LANG.dialogs.addUser.alreadyExists()
            .replace(
                '%systemName%',
                this.system.info.systemName || this.system.info.name
            );

        const defaultRole = this.system.accessRoles.find((role) =>
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
        })
            .then((user) => {
                if (user) {
                    this.hideErrors = true;
                    this.activeModal.close(user.id);
                }
            });
    }
}
