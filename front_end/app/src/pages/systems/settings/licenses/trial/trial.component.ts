import {
    Component,
    OnDestroy,
    Input,
    OnChanges,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-license-trial-component',
    templateUrl: 'trial.component.html',
    styleUrls: ['trial.component.scss']
})

export class NxLicenseTrialComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    activateTrialKey: any;

    trialLicense: string;
    trialLicenseText: any;
    haveTrialLicense: boolean;

    @Input() selectedServer: any = [];
    @Input() system: NxSystem;
    @Input() licenses: any = [];

    @ViewChild('newLicenseForm') licenseForm: HTMLFormElement;

    private setupDefaults() {
        this.trialLicense = this.CONFIG.trialLicenseKey || '';
        this.haveTrialLicense = true; // hide it initially until we get info about existing licenses

        this.activateTrialKey = this.processService.createProcess(() => {
            return this.system.serverManager
                .activateLicense(this.selectedServer.value, this.trialLicense)
                .then((response: any) => {
                    if (response.reply) {
                        this.system.licensesModified = this.trialLicense;
                        this.haveTrialLicense = true;

                        this.dialogsService.notify(
                            this.LANG.license.messages.trialActivated?.(),
                            'success'
                        );
                    }

                    if (response.error) {
                        switch (response.error) {
                            case '1':
                                this.dialogsService
                                    .notify(response.errorString, 'danger'); // missing param?
                                break;

                            case '2':
                                // Invalid license serial number provided. Serial number MUST be in format AAAA-BBBB-CCCC-DDDD

                            // eslint-disable-next-line no-fallthrough
                            case '3':
                                // Can't activate license:  License Key you have entered is invalid.
                                // This should not happen as keys are predefined per customization
                                this.dialogsService
                                    .notify(response.errorString, 'danger');
                        }
                    }
                }, fail => {
                    if (fail.error.type === 'error') {
                        this.dialogsService
                            .notify(this.LANG.errorCodes.licenseFail?.(), 'danger');
                    }
                });
        });
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.licenses && changes.licenses.currentValue) {
            this.haveTrialLicense = changes.licenses.currentValue.find(lic => {
                return lic.key === this.trialLicense;
            }) || false;
        }
    }

    ngOnDestroy(): void {
    }
}
