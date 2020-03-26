import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService, IConfig }    from '../../services/nx-config';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { BehaviorSubject }             from 'rxjs';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-add-user-content',
    templateUrl : 'add-user.component.html',
    styleUrls   : []
})
export class AddUserModalContent {
    @Input() system;
    @Input() closable;
    @ViewChild('addUserForm') form;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    addUser: any;
    user: any;
    selectedPermissionSubject = new BehaviorSubject<any>({ name: '' });
    accessDescription: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    get selectedPermission() {
        return this.selectedPermissionSubject.getValue();
    }

    set selectedPermission(role) {
        this.user.role = role;
        this.selectedPermissionSubject.next(role);
    }

    private getRoleDescription() {
        if (this.selectedPermission.description) {
            return this.selectedPermission.description;
        }
        if (this.selectedPermission.userRoleId) {
            return this.LANG.accessRoles.customRole.description;
        }
        if (this.LANG.accessRoles[this.selectedPermission.name]) {
            return this.LANG.accessRoles[this.selectedPermission.name].description;
        }
        return this.LANG.accessRoles.customRole.description;
    }

    setPermission(role: any) {
        this.selectedPermission = role;
        this.accessDescription = this.LANG.accessRoles[this.selectedPermission.name]
            ? this.LANG.accessRoles[this.selectedPermission.name].description
            : this.LANG.accessRoles.customRole.description;
    }

    saveUser() {
        return this.system.saveUser(this.user, this.user.role)
            .then(user => {
                return this.system.getUsers(true)
                    .then(() => user);
            });
    }

    ngOnInit() {
        this.user = {
            email     : '',
            isEnabled : true,
            role      : {
                name        : this.CONFIG.accessRoles.default,
                permissions : ''
            }
        };
        this.accessDescription = this.getRoleDescription();

        this.addUser = this.processService.createProcess(() => {
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
                    this.activeModal.close(user.id);
                }
            });
    }
}
