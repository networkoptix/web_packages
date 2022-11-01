import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    OnChanges,
    ViewChild,
    ElementRef,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service/process';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-backup-code-component',
    templateUrl: 'backup-code.component.html',
    styleUrls: ['backup-code.component.scss']
})
export class NxAuthorizeBackupCodeComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() code: string;
    @Output() codeChange = new EventEmitter<string>();
    @Input() checkBackupCodeProcess: Process;
    @Input() errorCode: string;
    @Input() window: Window;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendCode: () => void;
    @ViewChild('backupCodeForm', { static: false }) backupCodeForm: NgForm;
    @ViewChild('backToAuthSpan', { static: false }) backToAuthSpan: ElementRef<HTMLSpanElement>;
    needLargerFooter = false;
    header: string;
    subHeader: string;
    subHeaderSuffix: string;
    templateText: {
        [clientType: string]: {
            header: string,
            subHeader: string,
            subHeaderSuffix?: string
        }
    };

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.setupText();
        this.setText();

        this.sendCode = () => {
            this.codeChange.emit(this.code);
        };

        fromEvent<Event>(this.window, 'resize')
            .pipe(debounceTime(100))
            .subscribe(() => {
                this.needLargerFooter = this.backToAuthSpan.nativeElement.offsetHeight > 32;
            });
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeBackupCodeComponent>): void {
        if (changes.errorCode?.currentValue) {
            this.backupCodeForm?.controls.backupCode.setErrors({ [changes.errorCode.currentValue]: true });
        }

        if (!changes.clientType?.firstChange) {
            this.setText();
        }
    }

    setupText(): void {
        const auth = this.LANG.authorize;
        const connect = {
            header: auth.connectHeader(),
            subHeader: auth.toAccountSubheader()
        };
        const renew = {
            header: auth.expiredHeader(),
            subHeader: auth.expiredAccountSubheader()
        };
        const subHeader = auth.asAccountSubheader();
        const login = {
            header: auth.loginCloudHeader(),
            subHeader
        };
        this.templateText = {
            loginToCloud: login,
            loginToWebadmin: login,
            confirmPasswordDisconnect: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordDisconnect()
            },
            confirmPasswordMerge: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordMerge()
            },
            confirmPasswordCreateBackup: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordBackup()
            },
            confirmPasswordRestoreBackup: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordRestore()
            },
            confirmPasswordResetServer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordReset()
            },
            confirmPasswordRestartServer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordRestart()
            },
            confirmPasswordDetachServer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordDetach()
            },
            confirmPasswordTransfer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordTransfer()
            },
            connectSystemToCloud: connect,
            setupWizard: connect,
            renewSessionDesktop: renew,
            renewSessionWeb: renew
        };
    }

    setText(): void {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
        if (this.clientType.includes('Password')) {
            this.subHeaderSuffix = this.templateText[this.clientType]?.subHeaderSuffix;
        }
    }

    ngOnDestroy(): void {}
}
