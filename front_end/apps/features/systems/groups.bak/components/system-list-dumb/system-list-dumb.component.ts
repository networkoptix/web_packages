import { Component, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { IConfig } from '../../../../../services/nx-config/config-types';
import { NxConfigService } from '../../../../../services/nx-config/nx-config.service';
import type { SystemListItem } from '../../store/groups/groups.types';

@Component({
    selector: 'nx-system-list-dumb-component',
    templateUrl: 'system-list-dumb.component.html',
    styleUrls: ['system-list-dumb.component.scss', '@components/systems-list/list.component.scss']
})
export class NxSystemListDumbComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() systems: Array<SystemListItem> = [];
    @Input() searchString: string = '';

    account: Account;

    constructor(
        configService: NxConfigService,
        private language: NxLanguageProviderService,
        private accountService: NxAccountService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
    }

    public onDragStart(e: DragEvent, id: string, type: string): void {
        e.dataTransfer.setData('id', id);
        e.dataTransfer.setData('type', type);
    }

    public onDragOver(e: DragEvent): void {
        e.preventDefault();
    }

    ngOnInit(): void {
        this.accountService.get()
            .then(account => {
                if (account?.email) {
                    this.account = account;
                }
            });
    }

    canShowTag(system: SystemListItem): boolean {
        return system.stateOfHealth !== this.CONFIG.system.status.online &&
            !!this.LANG.systemStatuses;
    }

    canShowButton(system: SystemListItem): boolean {
        return this.LANG.system &&
            system.stateOfHealth === this.CONFIG.system.status.online &&
            !this.needToConfigureTwoFactor(system);
    }

    needToConfigureTwoFactor(system: SystemListItem): boolean {
        return system.system2faEnabled && !this.account?.account2faEnabled;
    }
}
