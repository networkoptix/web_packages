import { Component, OnInit } from '@angular/core';

import { NxAccountService } from '@services/account.service';
import { NxSystem } from '@services/system.service';
import { NxSystemService } from '@services/system.service/system.service';
import { NxMenuService } from '@src/menu/menu.service';

import { NxSettingsService } from '../../systems/settings/settings.service';

@Component({
    selector: 'logs',
    templateUrl: 'logs.component.html',
    styleUrls: ['logs.component.scss']
})
export class LogsComponent implements OnInit {
    system: NxSystem;

    constructor(
        private accountService: NxAccountService,
        private settingsService: NxSettingsService,
        private systemService: NxSystemService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'logs';
        this.menuService.detail = '';

        this.accountService.get().then(account => {
            if (!account) {
                return;
            }

            this.system = this.settingsService.system;

            if (!this.system) {
                const system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account.id,
                    account.email
                );
                system.update().then(() => {
                    this.system = system;
                    this.settingsService.system = system;
                });
            }
        });
    }
}
