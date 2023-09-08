import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, booleanAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import { icons, openClientError } from '@static-variables';

import type { SystemItem } from '../../home.types';

@Component({
    selector: 'nx-system-card',
    templateUrl: 'system-card.component.html',
    styleUrls: ['system-card.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        CdkMenuModule,
        AngularSvgIconModule,
        NxSearchHighlightComponent,
        NxAddSvgSrcDirective,
    ],
})
export class NxSystemCardComponent implements OnInit {
    @Input() system: SystemItem;
    @Input() search: string;
    @Input() account: Account;
    @Input({ transform: booleanAttribute }) showOwner: boolean = true;

    LANG = staticLang;
    CONFIG: IConfig;

    openClient: Process;
    modalActive: boolean;
    icons = icons;

    get tagType(): string {
        return (
            this.CONFIG.system.status[this.system.stateOfHealth]?.style ||
            this.CONFIG.system.status.default.style
        );
    }

    get systemState(): string {
        return this.LANG.systemStatuses[this.system.stateOfHealth] || this.system.stateOfHealth;
    }

    // We don't get useRest on system info from WebSocket, but but all v5
    // systems use the rest api
    get useRest(): boolean {
        return Number(this.system.version.charAt(0)) >= 5;
    }

    constructor(
        configService: NxConfigService,
        private dialogs: NxDialogsService,
        private processService: NxProcessService,
        private urlProtocol: NxUrlProtocolService,
        private router: Router,
    ) {
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
                    [openClientError]: () => {},
                },
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

    get getSystemOwnerName(): string {
        return this.system.ownerAccountEmail === this.account?.email
            ? ''
            : this.system.ownerFullName || this.system.ownerAccountEmail;
    }

    get systemNotOnline(): boolean {
        return this.system.stateOfHealth !== this.CONFIG.system.status.online;
    }

    get canShowButton(): boolean {
        return (
            this.LANG.system &&
            this.system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor
        );
    }

    get needToConfigureTwoFactor(): boolean {
        return this.system.system2faEnabled && !this.account?.sessionVerified;
    }

    openSystem(): void {
        this.router.navigate(['systems', this.system.id]);
    }
}
