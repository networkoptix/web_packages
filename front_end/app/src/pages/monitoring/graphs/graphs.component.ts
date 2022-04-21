import { Component, OnInit } from '@angular/core';

import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import { NxSystem } from '@services/system.service';
import { NxSystemService } from '@services/system.service/system.service';
import { NxMenuService } from '@src/menu/menu.service';

@Component({
    selector: 'graphs',
    templateUrl: 'graphs.component.html',
    styleUrls: ['graphs.component.scss']
})
export class GraphsComponent implements OnInit {
    system: NxSystem;

    constructor(
        private accountService: NxAccountService,
        private settingsService: NxSettingsService,
        private systemService: NxSystemService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'graphs';
        this.menuService.detail = '';

        this.system = this.settingsService.system;

        if (!this.system) {
            this.accountService.get().then(account => {
                if (!account) {
                    return;
                }
                const system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi,
                    account.id,
                    account.email
                );
                system.update().then(() => {
                    this.system = system;
                    this.settingsService.system = system;
                });
            });
        }
    }
}
