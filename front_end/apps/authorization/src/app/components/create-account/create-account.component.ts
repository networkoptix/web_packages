/* eslint-disable camelcase */
import { CommonModule } from '@angular/common';
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
    ElementRef,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { EmailModule } from '@components/email-input/email.module';
import { PasswordModule } from '@components/password-input/password.module';
import { PasswordValidationModule } from '@components/password-input-validation/password-validation.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { DirectivesModule } from '@directives/directives.module';
import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-create-account-component',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AngularSvgIconModule, DirectivesModule, CheckboxModule, EmailModule, PasswordModule, PasswordValidationModule, ProcessButtonModule],
    templateUrl: 'create-account.component.html',
    styleUrls: ['create-account.component.scss'],
})
export class NxAuthorizeCreateAccountComponent implements OnInit, OnChanges, OnDestroy {
    icons = icons;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() fromInvite: boolean;
    @Input() footerItems: { name: string; url: string }[];
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
    tooTall = false;

    @Input() errorCode: [inputType: string, errorCode: string];
    hideErrors: boolean;
    weakPassword: boolean = null;
    termsAndConditions = false;

    @Input() createAccountProcess: Process;
    onCreateSubmit: () => void;

    @ViewChild('createAccountForm', { static: false }) createForm: NgForm;
    @ViewChild('accountForm', { static: false }) accountForm: ElementRef<HTMLFormElement>;
    @ViewChild('rowEmail', { static: false }) rowEmail: ElementRef<HTMLDivElement>;
    @ViewChild('rowName', { static: false }) rowName: ElementRef<HTMLDivElement>;
    @ViewChild('rowPassword', { static: false }) rowPassword: ElementRef<HTMLDivElement>;
    @ViewChild('rowTerms', { static: false }) rowTerms: ElementRef<HTMLElement>;

    constructor(
        @Inject(WINDOW) private window: Window
    ) {
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
            changes.footerItems.currentValue.forEach((item: { name: string; name_raw: string; url: string }) => {
                if (item.name_raw === 'Terms') {
                    this.termsUrl = item.url;
                }
                if (item.name_raw === 'Privacy') {
                    this.privacyUrl = item.url;
                }
            });
        }
        setTimeout(() => {
            const insideHeight = this.rowEmail.nativeElement.offsetHeight +
                this.rowName.nativeElement.offsetHeight +
                this.rowPassword.nativeElement.offsetHeight +
                this.rowTerms.nativeElement.offsetHeight;
            this.tooTall = this.accountForm.nativeElement.offsetHeight < insideHeight;
        });
    }

    ngOnDestroy(): void { }

    externalLinkForDesktop(relativePath: string): false | undefined {
        if (this.window.nativeClient) {
            nativeClient.openUrlInBrowser(relativePath);
            return false;
        }
    }
}
