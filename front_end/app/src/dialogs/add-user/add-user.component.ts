import {
    Component, Inject, Input, OnInit, Renderer2, ViewEncapsulation
}                                                from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EmailValidator }                        from '@angular/forms';
import { NxConfigService }                       from '../../services/nx-config';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';
import { NxModalGenericComponent }               from '../generic/generic.component';
import { NxAccountService }                      from '../../services/account.service';

@Component({
    selector   : 'nx-modal-add-user-content',
    templateUrl: 'add-user.component.html',
    styleUrls  : []
})
export class AddUserModalContent {
    @Input() system;
    @Input() user;
    @Input() closable;

    LANG: any;
    config: any;
    title: string;
    sharing: any;
    url: string;
    accessRoles: any;
    options: any;
    isNewShare: boolean;
    buttonText: string;
    selectedPermission: {
        name: ''
    };
    accessDescription: string;

    constructor(public activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private configService: NxConfigService,
                private genericModal: NxModalGenericComponent,
                private language: NxLanguageProviderService,
                private accountService: NxAccountService,
                @Inject('process') private process: any,
    ) {
        this.url = 'share';
        this.accessRoles = [];
        this.config = configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    private getRoleDescription() {
        if (this.user.role.description) {
            return this.user.role.description;
        }
        if (this.user.role.userRoleId) {
            return this.LANG.accessRoles.customRole.description;
        }
        if (this.LANG.accessRoles[ this.user.role.name ]) {
            return this.LANG.accessRoles[ this.user.role.name ].description;
        }
        return this.LANG.accessRoles.customRole.description;
    }

    setPermission(role: any) {
        this.selectedPermission = role;
        this.accessDescription = this.LANG.accessRoles[this.selectedPermission.name] ?
                this.LANG.accessRoles[this.selectedPermission.name].description :
                this.LANG.accessRoles.customRole.description;
    }

    formatUserName() {
        if (!this.user.fullName || this.user.fullName.trim() === '') {
            return this.user.email;
        }

        return this.user.fullName + ' (' + this.user.email + ')';
    }

    doShare() {
        this.user.role = this.selectedPermission;

        return this.system.saveUser(this.user, this.user.role);
    }

    ngOnInit() {
        this.title = (!this.user) ? this.LANG.dialogs.sharing.shareTitle : this.LANG.dialogs.sharing.editShareTitle;
        this.buttonText = this.LANG.dialogs.sharing.shareConfirmButton;
        this.isNewShare = false;

        if (!this.user) {
            this.isNewShare = true;
            const predefinedRole = this.config.accessRoles.predefinedRoles.filter(role => {
                return role.name === this.config.accessRoles.default;
            })[0];
            this.user = {
                email    : '',
                isEnabled: true,
                role     : {
                    name       : this.config.accessRoles.default,
                    permissions: ''     // permissions will be updated within permissions component as it depends
                                        // on system's accessRoles
                }
            };
        }

        if (!this.user.role) {
            this.user.role = this.system.findAccessRole(this.user);
        }

        if (!this.isNewShare) {
            this.accountService
                .get()
                .then((account) => {
                    if (account.email === this.user.email) {
                        this.activeModal.close();
                        // this.toast.create({
                        //     className       : 'error',
                        //     content         : this.language.share.cantEditYourself,
                        //     dismissOnTimeout: true,
                        //     dismissOnClick  : true,
                        //     dismissButton   : false
                        // });
                    }

                    this.accessDescription = this.getRoleDescription();
                });

            this.buttonText = this.LANG.sharing.editShareConfirmButton;
        }

        this.sharing = this.process.init(() => {
            if (this.user.role.isOwner) {
                return this.genericModal
                    .openConfirm(this.LANG.dialogs.sharing.confirmOwner,
                        this.LANG.dialogs.sharing.shareTitle,
                        this.LANG.dialogs.sharing.shareConfirmButton,
                        null,
                        this.LANG.dialogs.cancelButton)
                    .then((result) => {
                        if (result) {
                            this.doShare();
                        }
                    });
            } else {
                return this.doShare();
            }
        }, {
            successMessage: this.LANG.dialogs.sharing.permissionsSaved
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}

@Component({
    selector     : 'nx-modal-add-user',
    template     : '',
    encapsulation: ViewEncapsulation.None,
    styleUrls    : []
})
export class NxModalAddUserComponent implements OnInit {
    modalRef: NgbModalRef;

    constructor(private modalService: NgbModal) {
    }

    private dialog(system?, user?) {
        // TODO: Refactor dialog to use generic dialog
        // TODO: retire loading ModalContent (CLOUD-2493)
        this.modalRef = this.modalService.open(AddUserModalContent,
                {
                            windowClass: 'modal-holder',
                            backdrop: 'static'
                        });

        this.modalRef.componentInstance.system = system;
        this.modalRef.componentInstance.user = user;
        this.modalRef.componentInstance.closable = true;

        return this.modalRef;
    }

    open(system?, user?) {
        return this.dialog(system, user).result;
    }

    ngOnInit() {
    }
}
