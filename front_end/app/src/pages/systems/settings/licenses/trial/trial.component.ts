import {
    Component,
    OnDestroy, Input, OnChanges,
    SimpleChanges, ViewChild
} from '@angular/core';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-license-trial-component',
    templateUrl : 'trial.component.html',
    styleUrls   : ['trial.component.scss']
})

export class NxLicenseTrialComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    activateTrialKey: any;
    number: string;
    days: string;

    license: string;
    trialLicenseText: any;
    selectedServer: any = {};
    haveTrialLicense: boolean;

    @Input() servers: any = [];
    @Input() system: NxSystem;
    @Input() licenses: any = [];

    @ViewChild('newLicenseForm') licenseForm: HTMLFormElement;

    private setupDefaults() {
        this.haveTrialLicense = true;

        switch (this.CONFIG.vmsName.toLowerCase().replace(' ', '')) {
            case 'nxwitness':
                this.license = '0000-0000-0000-0005';
                this.number = '4';
                this.days = '30';
                break;
            default:
        }

        this.activateTrialKey = this.processService.createProcess(() => {
            return this.system
                .activateLicense(this.selectedServer.id, this.license)
                .toPromise()
                .then(response => {
                    if (response.reply) {
                        this.system.licensesModified = true;
                        this.haveTrialLicense = true;

                        const msg = this.LANG.license.messages.trialActivated
                            .replace('{{number}}', this.number)
                            .replace('{{days}}', this.days);
                        this.dialogsService
                            .notify(msg, 'success');
                    }
                }, (fail) => {
                    if (fail.error.type === 'error') {
                        this.dialogsService
                            .notify(this.LANG.errorCodes.licenseFail, 'danger');
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
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.licenses && changes.licenses.currentValue) {
            this.haveTrialLicense = changes.licenses.currentValue.find((lic) => {
                return lic.key === this.license;
            });
        }
    }

    ngOnDestroy(): void {
    }
}
