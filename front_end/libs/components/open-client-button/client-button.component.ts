import { Component, OnInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUrlProtocolService } from '@services/url-protocol.service';

@Component({
    selector: 'nx-client-button',
    templateUrl: 'client-button.component.html',
    styleUrls: ['client-button.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxClientButtonComponent implements OnInit, OnDestroy {
    @Input() system;
    @Input() customClass;
    @Input() actionType;
    @Input() textOnly;

    CONFIG: IConfig;
    LANG = staticLang;

    location;
    canceled: boolean;
    modalActive: boolean;
    openClient: Process;
    account: Account;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private urlProtocol: NxUrlProtocolService,
        private dialogs: NxDialogsService,
        private accountService: NxAccountService,
        private router: Router,
    ) {
        this.location = location;
        this.CONFIG = configService.getConfig();
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

        this.openClient = this.processService.createProcess(
            () => {
                if (this.account.account2faEnabled && !this.system.useRest) {
                    return this.dialogs.client2faWarning();
                }
                return this.urlProtocol.open(this.system && this.system.id, this.system.useRest);
            },
            {
                errorCodes: {
                    notVisited: () => false,
                },
            },
            () => {
                this.modalActive = false;
            },
            () => {
                if (this.modalActive || this.canceled) {
                    return;
                }
                this.modalActive = true;
                return this.dialogs
                    .confirm({
                        title: this.LANG.dialogs.titles.noClientDetected,
                        message: this.LANG.errorCodes.cantOpenClient,
                        footer: {
                            actionLabel: this.LANG.dialogs.buttons.download,
                            cancelLabel: this.LANG.dialogs.buttons.cancel,
                        },
                    })
                    .then(result => {
                        if (result) {
                            this.router.navigate(['/download']).catch(error => {
                                console.error(error);
                            });
                        }
                    })
                    .finally(() => {
                        this.modalActive = false;
                    });
            },
        );
    }
}
