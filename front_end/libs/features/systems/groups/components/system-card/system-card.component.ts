import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons, openClientError } from '@lib/variables/static-variables';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxUrlProtocolService } from '@services/url-protocol.service';

import type { SystemItem } from '../../groups.types';

@Component({
    selector: 'nx-system-card',
    templateUrl: 'system-card.component.html',
    styleUrls: ['system-card.component.scss'],
    encapsulation: ViewEncapsulation.None,
    // Need to escape encapsulation to style menu
})
export class NxSystemCardComponent implements OnInit {
    @Input() system: SystemItem;
    @Input() search: string;
    @Input() account: Account;
    @IBool() @Input() showOwner: CoercedBoolInput = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    openClient: Process;
    modalActive: boolean;
    icons = icons;

    get tagType(): string {
        return this.CONFIG.system.status[this.system.stateOfHealth]?.style ||
            this.CONFIG.system.status.default.style;
    }

    get systemState(): string {
        return this.LANG.systemStatuses[this.system.stateOfHealth]?.() ||
            this.system.stateOfHealth;
    }

    // We don't get useRest on system info from WebSocket, but but all v5
    // systems use the rest api
    get useRest(): boolean {
        return Number(this.system.version.charAt(0)) >= 5;
    }

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private dialogs: NxDialogsService,
        private processService: NxProcessService,
        private urlProtocol: NxUrlProtocolService,
        private router: Router,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {
        this.openClient = this.processService.createProcess(
            () => {
                return this.account.account2faEnabled && !this.useRest
                    ? this.dialogs.client2faWarning()
                    : this.urlProtocol.open(this.system.id, this.useRest);
            },
            {
                errorCodes: {
                    [openClientError]: () => { }
                }
            },
            () => {
                this.modalActive = false;
            },
            () => {
                if (this.modalActive) {
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

    get getSystemOwnerName(): string {
        return this.system.ownerAccountEmail === this.account?.email
            ? ''
            : (this.system.ownerFullName || this.system.ownerAccountEmail);
    }

    get systemNotOnline(): boolean {
        return this.system.stateOfHealth !== this.CONFIG.system.status.online;
    }

    get canShowButton(): boolean {
        return this.LANG.system &&
            this.system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor;
    }

    get needToConfigureTwoFactor(): boolean {
        return this.system.system2faEnabled && !this.account?.sessionVerified;
    }

    openSystem(): void {
        this.router.navigate(['systems', this.system.id]);
    }
}
