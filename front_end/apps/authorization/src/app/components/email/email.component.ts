import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';

import { environment } from '@environments/environment';
import { credentialsValidation, icons } from '@lib/variables/static-variables';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';
import { setupText, TemplateText } from '../setupText';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-email-component',
    templateUrl: 'email.component.html',
    styleUrls: ['email.component.scss']
})
export class NxAuthorizeEmailComponent implements OnInit, OnDestroy, OnChanges {
    CONFIG: IConfig;
    readonly environment = environment;

    @Input() clientType: string;
    @Input() viewType: string;
    @Input() loginEmail: string;
    @Output() loginEmailChange = new EventEmitter<string>();
    @Input() emailProcess: Process;
    @Input() errorCode: string;
    @Input() reactivate: () => Promise<void>;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendEmail: () => void;
    isMobile = true;
    @ViewChild('emailForm', { static: false }) emailForm: NgForm;
    header: string;
    subHeader: string | undefined;
    templateText: TemplateText;
    emailAutoFilled = false;
    credentialsValidation = credentialsValidation;
    icons = icons;

    constructor(
        configService: NxConfigService,
        private deviceService: DeviceDetectorService
    ) {
        this.CONFIG = configService.getConfig();
    }

    private handleErrors(changes: NgChanges<NxAuthorizeEmailComponent>): void {
        const { email } = this.emailForm?.controls;
        if (!email) {
            return;
        }
        email.setErrors({ [changes.errorCode.currentValue]: true });
        email.markAsTouched();
        email.markAsDirty();
    }

    ngOnInit(): void {
        this.templateText = setupText('email');
        this.setText();
        this.sendEmail = () => {
            if (this.emailAutoFilled && this.errorCode) {
                this.emailForm?.controls?.email.setErrors(null);
            }
            this.loginEmailChange.emit(this.loginEmail);
        };
        this.isMobile = this.deviceService.isMobile();
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeEmailComponent>): void {
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

        const email = changes?.loginEmail;
        if (email?.firstChange && !email.previousValue && email.currentValue) {
            this.emailAutoFilled = true;
        }
    }

    ngOnDestroy(): void { }

    setupNonCloudSystem(): void {
        // TODO: waiting for new setup wizard
    }

    setText(): void {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
    }
}
