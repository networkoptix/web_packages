import {
    Component, Inject, OnInit,
    Input, ViewChild, Renderer2
}                                    from '@angular/core';
import {
    DOCUMENT, Location
}                                    from '@angular/common';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }           from '../../services/nx-config';
import { NxUtilsService }            from '../../services/utils.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxModalGenericComponent }   from '../generic/generic.component';
import { LocalStorageService }       from 'ngx-store';
import { NxProcessService }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';

@Component({
    selector: 'ngbd-modal-content',
    templateUrl: 'login.component.html',
    styleUrls: [],
})
export class LoginModalContent implements OnInit {
    @Input() account;
    @Input() login;
    @Input() cancellable;
    @Input() closable;
    @Input() keepPage;

    LANG: any;
    CONFIG: any;

    auth: any;
    next: string;
    password: string;
    remember: boolean;
    location: any;

    wrongPassword: boolean;
    accountBlocked: boolean;

    @ViewChild('loginForm', { static: true }) loginForm: HTMLFormElement;

    private setupDefaults() {
        this.auth = { email: this.localStorage.get('email') };
        this.next = '';
        this.password = '';
        this.remember = true;
        this.wrongPassword = false;
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    constructor(private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private localStorage: LocalStorageService,
                private activeModal: NgbActiveModal,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private genericModal: NxModalGenericComponent,
                private renderer: Renderer2,
                location: Location,
                @Inject(DOCUMENT) private document: any,
    ) {
        this.setupDefaults();

        this.location = location;
    }

    resendActivation(email) {
        this.activeModal.close();

        this.processService.createProcess(() => {
            return this.cloudApiService.reactivate(email);
        }, {
            errorCodes: {
                forbidden: this.LANG.errorCodes.accountAlreadyActivated,
                notFound: this.LANG.errorCodes.emailNotFound
            },
            holdAlerts: true,
            errorPrefix: this.LANG.errorCodes.cantSendConfirmationPrefix
        })
        .run()
        .then(() => {
            this.genericModal.openConfirm(
                    'Check your inbox and visit provided link to activate account',
                    'Activation email sent',
                    'OK');
        });
    }

    gotoRegister() {
        // TODO: Repace this once 'register' page is moved to A5
        // AJS and A5 routers freak out about route change *****
        // this.location.go('/register');
        this.document.location.href = '/register';
        this.activeModal.close();
    }

    resetForm() {
        if (!this.loginForm.valid) {
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;
        }
    }

    ngOnInit() {
        // Check the url queryparams for next. if it exists set next equal to it.
        const nextUrl = /\?next=(.*)/.exec(this.document.location.search.replace(/%2F/g, '/'));
        if (nextUrl && nextUrl.length > 1) {
            this.next = nextUrl[1];
        }
        this.password = '';

        this.login = this.processService.createProcess(() => {
            this.loginForm.controls.login_email.setErrors(undefined);
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            return this.account.login(this.auth.email, this.password, this.remember);
        }, {
            ignoreUnauthorized: true,
            errorCodes: {
                accountNotActivated: () => {
                    this.password = '';
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.loginForm.controls.login_email.setErrors({ not_activated: true });
                    this.renderer.selectRootElement('#login_email').select();
                },
                notAuthorized: () => {
                    this.wrongPassword = true;
                    this.loginForm.controls.login_password.setErrors({ nx_wrong_password: true });
                    this.password = '';

                    this.renderer.selectRootElement('#login_password').focus();

                },
                notFound: () => {
                    this.password = '';
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.loginForm.controls.login_email.setErrors({ no_user: true });
                    this.renderer.selectRootElement('#login_email').select();
                },
                accountBlocked: () => {
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.accountBlocked = true;
                    this.loginForm.controls.login_password.setErrors({ nx_account_blocked: true });
                },
                wrongParameters: () => {
                },
                portalError: this.LANG.errorCodes.brokenAccount
            }
        }).then(() => {
            this.activeModal.close();
            if (this.keepPage) {
                if (this.location.path() === '') {
                    this.location.go(this.CONFIG.redirectAuthorised);
                } else {
                    // TODO: remove window reload once we separate session state from account service
                    window.location.reload();
                    // this.location.go(this.location.path());
                }
            } else if (this.next) {
                // sanitize this.next
                this.next = NxUtilsService.getRelativeLocation(this.next);
                this.location.go(this.next);
            } else {
                setTimeout(() => {
                    this.location.go(this.CONFIG.redirectAuthorised);
                });
            }
        });
    }

    close() {
        // prevent unnecessary reload
        if (!this.keepPage) { // && this.accountService.getEmail() === undefined) {
            this.location.go(this.CONFIG.redirectUnauthorised);
        }

        this.activeModal.close('canceled');
    }
}

// @Component({
//     selector: 'nx-modal-login',
//     template: '',
//     encapsulation: ViewEncapsulation.None,
//     styleUrls: []
// })
// export class NxModalLoginComponent implements OnInit {
//     login: any;
//     modalRef: NgbModalRef;
//     location: Location;
//     closeResult: string;
//
//     constructor(@Inject('languageService') private language: any,
//                 private modalService: NgbModal,
//                 // private dialogs: NxDialogsService,
//                 location: Location) {
//
//         this.location = location;
//     }
//
//     private dialog(keepPage?) {
//         // TODO: Refactor dialog to use generic dialog
//         // TODO: retire loading ModalContent (CLOUD-2493)
//         this.modalRef = this.modalService.open(LoginModalContent,
//                 {
//                             windowClass: 'modal-holder',
//                             backdrop: 'static',
//                             size: 'sm'
//                         });
//         this.modalRef.componentInstance.language = this.language;
//         this.modalRef.componentInstance.login = this.login;
//         this.modalRef.componentInstance.cancellable = !keepPage || false;
//         this.modalRef.componentInstance.closable = true;
//         this.modalRef.componentInstance.location = this.location;
//         this.modalRef.componentInstance.keepPage = (keepPage !== undefined) ? keepPage : true;
//
//         return this.modalRef;
//     }
//
//     open(keepPage?) {
//         return this.dialog(keepPage)
//                 .result
//                 // handle how the dialog was closed
//                 // required if we need to have dismissible dialog otherwise
//                 // will raise a JS error ( Uncaught [in promise] )
//                 .then((result) => {
//                     this.closeResult = `Closed with: ${result}`;
//                 }, (reason) => {
//                     this.closeResult = 'Dismissed';
//                 });
//     }
//
//     ngOnInit() {
//         // Initialization should be in LoginModalContent.ngOnInit()
//     }
// }
