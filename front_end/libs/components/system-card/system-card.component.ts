import { Component, Input, OnChanges } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-system-card',
    templateUrl: 'system-card.component.html',
    styleUrls: ['system-card.component.scss'],
})
export class SystemCardComponent implements OnChanges {
    @Input() system: NxSystemInfo;
    @Input() search: string;
    @Input() account: Account;
    @Input() openSystem: (system: NxSystemInfo) => void;

    LANG = staticLang;
    CONFIG: IConfig;
    icons = icons;
    needToConfigureTwoFactor = false;
    canShowButton = false;
    canShowTag = false;

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

    ngOnChanges({ system }: NgChanges<SystemCardComponent>): void {
        if (system) {
            this.needToConfigureTwoFactor =
                system.currentValue.system2faEnabled && !this.account?.sessionVerified;
            this.canShowButton =
                this.LANG.system &&
                system.currentValue.stateOfHealth === this.CONFIG.system.status.online &&
                !this.needToConfigureTwoFactor;
            this.canShowTag =
                system.currentValue.stateOfHealth !== this.CONFIG.system.status.online &&
                !!this.LANG.systemStatuses;
        }
    }

    getSystemOwnerName(): string {
        return this.systemsService.getSystemOwnerName(this.system);
    }
}
