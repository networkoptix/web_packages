/* eslint-disable camelcase */
import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
    Inject,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service/process';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-create-account-component',
    templateUrl: 'create-account.component.html',
    styleUrls: ['create-account.component.scss']
})
export class NxAuthorizeCreateAccountComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() fromInvite: boolean;
    @Input() footerItems: { name: string, url: string }[];
    @Input() accountInfo: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    };

    @Output() accountInfoChange = new EventEmitter<{
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }>();

    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    existingEmail: string;
    createEmail: string;
    createFirstName: string;
    createLastName: string;
    createPassword: string;
    termsUrl: string;
    privacyUrl: string;

    @Input() errorCode: [inputType: string, errorCode: string];
    hideErrors: boolean;
    weakPassword = null;
    termsAndConditions = false;

    @Input() createAccountProcess: Process;
    onCreateSubmit: any;

    @ViewChild('createAccountForm', { static: false }) createForm: NgForm;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        if (this.loginEmail) {
            if (this.viewType === 'setupWizard') {
                this.existingEmail = this.loginEmail;
            } else {
                this.createEmail = this.loginEmail;
            }
        }

        this.onCreateSubmit = () => {
            this.accountInfoChange.emit({
                email: this.existingEmail || this.createEmail,
                firstName: this.createFirstName,
                lastName: this.createLastName,
                password: this.createPassword
            });
        };
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeCreateAccountComponent>): void {
        if (changes.errorCode) {
            const eC = changes.errorCode.currentValue;
            this.createForm?.controls[eC[0]].setErrors({ [eC[1]]: true });
        }
        if (changes.footerItems) {
            changes.footerItems.currentValue.forEach((item: { name_raw: string, url: string }) => {
                if (item.name_raw === 'Terms') {
                    this.termsUrl = item.url;
                }
                if (item.name_raw === 'Privacy') {
                    this.privacyUrl = item.url;
                }
            });
        }
    }

    ngOnDestroy(): void {}

    externalLinkForDesktop(relativePath: string) {
        if (this.window.nativeClient) {
            nativeClient.openUrlInBrowser(relativePath);
            return false;
        }
    }
}
