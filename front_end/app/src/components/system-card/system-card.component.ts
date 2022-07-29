import { Component, Input } from '@angular/core';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystemWithUserInfo } from '@services/system.service/system-types';
import { NxSystemsService } from '@services/systems.service';

@Component({
    selector: 'system-card',
    templateUrl: 'system-card.component.html',
    styleUrls: ['system-card.component.scss']
})
export class SystemCardComponent {
    @Input() system: NxSystemWithUserInfo;
    @Input() size: 'full' | 'mid' | 'compact';
    @Input() systemsToShow: string[];
    @Input() userEmail: string;
    @Input() search: string;
    @Input() account: Account;
    @Input() openSystem: (system: NxSystemWithUserInfo) => void;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    get tagType(): string {
        return this.CONFIG.system.status[this.system.stateOfHealth]?.style ||
            this.CONFIG.system.status.default.style;
    }

    get systemState(): string {
        return this.LANG.systemStatuses[this.system.stateOfHealth]() ||
            this.system.stateOfHealth;
    }

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private systemsService: NxSystemsService,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.config;
    }

    getSystemOwnerName(
        system: NxSystemWithUserInfo,
        currentEmail: string
    ): string {
        return this.systemsService.getSystemOwnerName(system, currentEmail);
    }

    canShowTag(system: NxSystemWithUserInfo): boolean {
        return system.stateOfHealth !== this.CONFIG.system.status.online &&
            !!this.LANG.systemStatuses;
    }

    canShowButton(system: NxSystemWithUserInfo): boolean {
        return this.LANG.system &&
            system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor(system);
    }

    needToConfigureTwoFactor(system: NxSystemWithUserInfo): boolean {
        return system.system2faEnabled && !this.account?.sessionVerified;
    }
}
