import { Component, Input } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';

@Component({
    selector: 'nx-system-card',
    templateUrl: 'system-card.component.html',
    styleUrls: ['system-card.component.scss'],
})
export class SystemCardComponent {
    @Input() system: NxSystemInfo;
    @Input() search: string;
    @Input() account: Account;
    @Input() openSystem: (system: NxSystemInfo) => void;

    LANG = staticLang;
    CONFIG: IConfig;
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

    constructor(configService: NxConfigService, private systemsService: NxSystemsService) {
        this.CONFIG = configService.config;
    }

    getSystemOwnerName(): string {
        return this.systemsService.getSystemOwnerName(this.system, this.account?.email);
    }

    canShowTag(): boolean {
        return (
            this.system.stateOfHealth !== this.CONFIG.system.status.online &&
            !!this.LANG.systemStatuses
        );
    }

    canShowButton(): boolean {
        return (
            this.LANG.system &&
            this.system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor()
        );
    }

    needToConfigureTwoFactor(): boolean {
        return this.system.system2faEnabled && !this.account?.sessionVerified;
    }
}
