import { Component, Input, OnInit } from '@angular/core';

import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service/system';

@Component({
    selector: 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss'],
})
export class NxSystemUsersComponent implements OnInit {
    @Input() system: NxSystem;
    readonly environment = environment;
    CONFIG: IConfig;

    before5dot2: boolean = false;
    fiveDot2Plus: boolean = false;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    public ngOnInit(): void {
        // users with groups
        if (this.system.version >= 5.2 && this.CONFIG.featureFlags.usersWithGroups) {
            this.fiveDot2Plus = true;
        } else {
            // users with roles
            this.before5dot2 = true;
        }
    }
}
