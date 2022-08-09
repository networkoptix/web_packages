import {
    Component,
    OnInit,
    Input,
    ViewEncapsulation,
    OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUrlProtocolService } from '@services/url-protocol.service';

@Component({
    selector: 'nx-client-button',
    templateUrl: 'client-button.component.html',
    styleUrls: ['client-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxClientButtonComponent implements OnInit, OnDestroy {
    @Input() system;
    @Input() customClass;
    @Input() actionType;
    @Input() textOnly;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    location;
    canceled: boolean;
    modalActive: boolean;
    openClient: Process;
    account: Account;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private urlProtocol: NxUrlProtocolService,
        private language: NxLanguageProviderService,
        private dialogs: NxDialogsService,
        private accountService: NxAccountService,
        private router: Router,
    ) {
        this.location = location;
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
    }

    ngOnDestroy(): void {
        this.canceled = true;
    }

    ngOnInit(): void {
        this.accountService.get().then((account: Account) => {
            if (account) {
                this.account = account;
            }
        });

        this.modalActive = false;
        this.canceled = false;

        this.openClient = this.processService.createProcess(() => {
            if (this.account.account2faEnabled && !this.system.useRest) {
                return this.dialogs.client2faWarning();
            }
            return this.urlProtocol
                .open(this.system && this.system.id, this.system.useRest);
        }, {
            errorCodes: {
                notVisited: () => false
            }
        }, () => {
            this.modalActive = false;
        }, () => {
            // message, title, actionLabel, actionType
            if (this.modalActive || this.canceled) {
                return;
            }
            this.modalActive = true;
            return this.dialogs
                .confirm(
                    this.LANG.errorCodes.cantOpenClient(),
                    this.LANG.dialogs.titles.noClientDetected(),
                    this.LANG.dialogs.buttons.download(),
                    'btn-primary',
                    this.LANG.dialogs.buttons.cancel()
                )
                .then(result => {
                    if (result === true) {
                        this.router
                            .navigate(['/download'])
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }).finally(() => {
                    this.modalActive = false;
                });
        });
    }
}
