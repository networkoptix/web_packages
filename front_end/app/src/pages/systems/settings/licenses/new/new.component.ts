import {
    Component,
    OnDestroy, Input, OnChanges,
    SimpleChanges
}                                    from '@angular/core';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';

interface iLicense {
    key: string
}

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

    license: iLicense = { key: '' };
    selectedServer: any = {};

    @Input() servers: any;
    @Input() system: any;

    private setupDefaults() {
        this.activateKey = this.processService.createProcess(() => {
            return this.system
                .activateLicense(this.selectedServer.id.slice(1, -1))
                .then(response => {
                    // ****** WIP : to fe finished in another task *****
                    // if (typeof (response.error) !== 'undefined' && response.error !== '0') {
                    //     const errorToShow = response.errorString;
                    //     this.dialogsService
                    //         .alert(errorToShow, this.LANG.dialogs.titles.error)
                    //         .catch(error => {
                    //             console.error(error);
                    //         });
                    // } else {
                    //     this.dialogsService
                    //         .alert(this.LANG.dialogs.message.logLevelsSaved, this.LANG.dialogs.titles.success)
                    //         .catch(error => {
                    //             console.error(error);
                    //         });
                    // }
                }, () => {
                    // this.dialogsService
                    //     .alert(this.LANG.dialogs.message.logLevelsNotSaved, this.LANG.dialogs.titles.error)
                    //     .catch(error => {
                    //         console.error(error);
                    //     });
                    // ****** WIP : to fe finished in another task *****
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
        if (changes.servers && changes.servers.currentValue) {
            this.serverOptions = [];

            if (changes.servers.currentValue.length) {
                changes.servers.currentValue.forEach((server) => {
                    const option: any = {
                        name : server.name,
                        id   : server.id
                    };

                    if (server.status === 'Online') {
                        option.help = `&mdash;&nbsp;${server.status}`;
                    }

                    this.serverOptions.push(option);
                });
            }
        }
    }

    setLicenseKey(key, form) {
        this.license.key = key.toUpperCase();
        form.controls.licenseKey.markAsUntouched();
    }

    ngOnDestroy(): void {
    }
}
