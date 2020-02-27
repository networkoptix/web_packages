import {
    Component, Input, Renderer2
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }           from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxModalGenericComponent }   from '../generic/generic.component';
import { NxToastService }            from '../toast.service';
import { NxProcessService }          from '../../services/process.service';
import { BehaviorSubject }           from 'rxjs';

@Component({
    selector   : 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls  : []
})
export class AddUserModalContent {
    @Input() account;
    @Input() system;
    @Input() user;
    @Input() closable;

    LANG: any;
    CONFIG: any;

    title: string;
    sharing: any;
    accessRoles: any;
    options: any;
    isNewShare: boolean;
    buttonText: string;
    selectedPermissionSubject = new BehaviorSubject<any>({ name: '' });
    accessDescription: string;

    constructor(public activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private configService: NxConfigService,
                private genericModal: NxModalGenericComponent,
                private language: NxLanguageProviderService,
                private toastService: NxToastService,
                private processService: NxProcessService
    ) {
        this.accessRoles = [];
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
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

    formatUserName() {
        if (!this.user.fullName || this.user.fullName.trim() === '') {
            return this.user.email;
        }

        return this.user.fullName + ' (' + this.user.email + ')';
    }

    doShare() {
        return this.system.saveUser(this.user, this.user.role).then((user) => {
            return this.system.getUsers(true).then(() => {
                return new Promise(resolve => setTimeout(() => resolve(user)));
            });
        });
    }

    ngOnInit() {
        this.title = (!this.user) ? this.LANG.dialogs.sharing.shareTitle : this.LANG.dialogs.sharing.editShareTitle;
        this.buttonText = this.LANG.dialogs.sharing.shareConfirmButton;
        this.isNewShare = false;

        if (!this.user) {
            this.isNewShare = true;
            this.user = {
                email    : '',
                isEnabled: true,
                role     : {
                    name       : this.CONFIG.accessRoles.default,
                    permissions: '' // permissions will be updated within permissions component as it depends
                    // on system's accessRoles
                }
            };
        }

        if (!this.user.role) {
            this.user.role = this.system.findAccessRole(this.user);
        }

        if (!this.isNewShare) {
            this.account
                .get()
                .then((account) => {
                    if (account) {
                        if (account.email === this.user.email) {
                            this.activeModal.close();

                            const options = {
                                autohide : true,
                                classname: this.CONFIG.toast.danger,
                                delay    : this.CONFIG.alertTimeout
                            };

                            return this.toastService.show(this.LANG.share.cantEditYourself, options);
                        }

                        this.accessDescription = this.getRoleDescription();
                    }
                });

            this.buttonText = this.LANG.sharing.editShareConfirmButton;
        }

        this.sharing = this.processService.createProcess(() => {
            if (this.user.role.isOwner) {
                return this.genericModal
                    .openConfirm(this.LANG.dialogs.sharing.confirmOwner,
                        this.LANG.dialogs.sharing.shareTitle,
                        this.LANG.dialogs.sharing.shareConfirmButton,
                        undefined,
                        this.LANG.dialogs.buttons.cancel)
                    .then((result) => {
                        if (result) {
                            return this.doShare();
                        }
                    });
            } else {
                return this.doShare();
            }
        }, {
            errorPrefix: this.LANG.errorCodes.cantSharePrefix
        }).then((user) => {
            this.activeModal.close(user.id);
        });
    }

    close() {
        this.activeModal.close();
    }
}
