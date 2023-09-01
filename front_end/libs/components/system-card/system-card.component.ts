import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { SystemItem } from '@pages/home/home.types';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-system-card',
    templateUrl: 'system-card.component.html',
    styleUrls: ['system-card.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxClientButtonComponent,
        NxSearchHighlightComponent,
        NxTagComponent,
        NxAddSvgSrcDirective,
    ],
})
export class SystemCardComponent implements OnChanges {
    @Input() system: SystemItem | NxSystemInfo;
    @Input() search: string;
    @Input() account: Account;
    @Input() openSystem: (system: NxSystemInfo | SystemItem) => void;

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
