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
import { SubscriptionLike }          from 'rxjs';
import { NxScrollMechanicsService }  from '../../../../../services/scroll-mechanics.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-license-new-component',
    templateUrl : 'new.component.html',
    styleUrls   : ['new.component.scss']
})

export class NxLicenseNewComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    serverOptions: any = [];
    activateKey: any;

    license: string;
    selectedServer: any = {};
    keyUsedIn: string;

    @Input() servers: any = [];
    @Input() system: NxSystem;
    @Input() licenses: any = [];

    windowSizeSubscription: SubscriptionLike;

    @ViewChild('newLicenseForm') licenseForm: HTMLFormElement;
    @ViewChild('errorDiv') errorDiv: HTMLDivElement;
    @ViewChild('errorDivMirror') errorDivMirror: HTMLDivElement;

    private setupDefaults() {
        this.activateKey = this.processService.createProcess(() => {
            if (!this.system.isOnline) {
                return new Promise((resolve, reject) => {
                    this.licenseForm.controls.licenseKey.setErrors({ offline: true });
                    this.licenseForm.controls.licenseKey.markAsTouched();

                    // eslint-disable-next-line prefer-promise-reject-errors
                    return reject('offline');
                });
            } else if (this.isActivated(this.license)) {
                return new Promise((resolve, reject) => {
                    this.licenseForm.controls.licenseKey.setErrors({ alreadyRegistered: true });
                    this.licenseForm.controls.licenseKey.markAsTouched();
                    // eslint-disable-next-line prefer-promise-reject-errors
                    return reject('alreadyRegistered');
                });
            } else {
                return this.system
                    .activateLicense(this.selectedServer.value, this.formatLicenseKey(this.license))
                    .then(response => {
                        if (response.reply) {
                            this.system.licensesModified = this.license;
                            this.license = '';

                            this.dialogsService
                                .notify(this.LANG.license.messages.activated, 'success');

                            return;
                        }

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
                                if (response.errorString.indexOf('License Key you have entered is invalid') !== -1) {
                                    this.licenseForm.controls.licenseKey.setErrors({ mask: true });
                                }
                                // Can't activate license:   This License Key has been previously activated to Hardware Id 052f25774269474ec8f9454d92ca9511cf on 2020-04-10 21:04:30.776094+00:00..
                                // eslint-disable-next-line no-case-declarations
                                let matchStart = response.errorString.indexOf('activated to Hardware Id');
                                if (matchStart !== -1) {
                                    // get HWID
                                    matchStart += 'activated to Hardware Id '.length;
                                    const matchEnd = response.errorString.substr(matchStart).indexOf(' ');
                                    this.keyUsedIn = response.errorString.substr(matchStart, matchEnd);
                                    this.licenseForm.controls.licenseKey.setErrors({ inuse: true });
                                }
                                this.licenseForm.controls.licenseKey.markAsTouched();
                                break;

                            default:
                        }
                    }, (fail) => {
                        if (fail.error && fail.error.type === 'error') {
                            this.dialogsService
                                .notify(this.LANG.errorCodes.licenseFail, 'danger');
                        } else {
                            console.error(fail);
                        }
                    });
            }
        }, {
            errorCodes: {
                offline           : () => {},
                alreadyRegistered : () => {}
            }
        });
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.servers && changes.servers.currentValue) {
            this.serverOptions = [];

            if (changes.servers.currentValue.length) {
                changes.servers.currentValue.forEach((server) => {
                    const option: any = {
                        name  : server.name,
                        value : server.id
                    };

                    if (server.status !== 'Online') {
                        option.help = `&mdash;&nbsp;${server.status}`;
                    }

                    this.serverOptions.push(option);
                });

                this.selectedServer = this.serverOptions[0] || {};
            }
        }
    }

    pasteFn(form) {
        navigator.clipboard.readText().then(clipText => {
            this.setLicenseKey(clipText.replace(/-/g, ''), form); // don't confuse ngModel - remove dashes :)
        });
    }

    setLicenseKey(key, form) {
        this.license = key;
        form.controls.licenseKey.markAsUntouched();
    }

    changeServer(server) {
        this.selectedServer = server;
    }

    ngOnDestroy(): void {
    }

    private formatLicenseKey = (key: string) => {
        const chunks = key.match(/.{1,4}/g);
        return chunks.join('-').toUpperCase(); // returns AAAA-BBBB-CCCC-DDDD
    };

    private isActivated(license): boolean {
        return this.licenses.find((lic) => {
            return lic.key === this.formatLicenseKey(license);
        });
    }
}
