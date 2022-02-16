import {
    Component, EventEmitter, Input, OnChanges, OnDestroy,
    OnInit, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service';

import { AuthorizeStateType } from '../authorize.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-email-component',
    templateUrl: 'email.component.html',
    styleUrls: ['email.component.scss']
})
export class NxAuthorizeEmailComponent implements OnInit, OnDestroy, OnChanges {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    @Input() clientType: string;
    @Input() viewType: string;
    @Input() loginEmail: string;
    @Output() loginEmailChange = new EventEmitter<string>();
    @Input() emailProcess: Process;
    @Input() errorCode: string;
    @Input() reactivate: () => Promise<any>;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendEmail: any;
    isMobile = true;
    @ViewChild('emailForm', { static: false }) emailForm: HTMLFormElement;
    header: string;
    subHeader: string;
    templateText: {
        [clientType: string]: {
            header: string,
            subHeader?: string
        }
    };

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private deviceService: DeviceDetectorService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    private handleErrors (changes) {
        const { email } = this.emailForm?.controls;
        if (!email) {
            return;
        }
        email.setErrors({ [changes.errorCode.currentValue]: true });
        email.markAsTouched();
        email.markAsDirty();
    }

    ngOnInit(): void {
        this.setupText();
        this.setText();
        this.sendEmail = () => {
            this.loginEmailChange.emit(this.loginEmail);
        };
        this.isMobile = this.deviceService.isMobile();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode?.currentValue) {
            // Handles when form isn't ready yet.
            if (!this.emailForm?.controls?.email) {
                setTimeout(() => {
                    this.handleErrors(changes);
                });
            } else {
                this.handleErrors(changes);
            }
        }

        if (!changes.clientType?.firstChange) {
            this.setText();
        }
    }

    ngOnDestroy(): void {}

    setupNonCloudSystem() {
        // TODO: waiting for new setup wizard
    }

    setupText() {
        const auth = this.LANG.authorize;
        const connect = {
            header: auth.connectHeader(),
            subHeader: auth.connectSubheader()
        };
        const renew = {
            header: auth.expiredHeader(),
            subHeader: auth.expiredSubheader()
        };
        const login = {
            header: auth.loginCloudHeader()
        };
        this.templateText = {
            loginToCloud: login,
            loginToWebadmin: login,
            connectSystemToCloud: connect,
            setupWizard: connect,
            renewSessionDesktop: renew,
            renewSessionWeb: renew
        };
    }

    setText() {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
    }
}
