import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { Process } from '@services/process.service/process';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import { icons } from '@static-variables';

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
export class NxSystemCardComponent {
    @Input() system: SystemItem;
    @Input() search: string;
    @Input() account: Account;
    @Input({ transform: booleanAttribute }) showOwner: boolean = true;

    LANG = staticLang;
    CONFIG: IConfig;

    openClient: Process;
    modalActive: boolean;
    icons = icons;

    openingClient$$ = computed(() => this.urlProtocol.openingSystem$$());

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
        private urlProtocol: NxUrlProtocolService,
        private router: Router,
    ) {
        this.CONFIG = configService.config;
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

    openVmsClient(): void {
        this.urlProtocol.openVmsClient({ id: this.system.id, useRest: this.useRest });
    }
}
