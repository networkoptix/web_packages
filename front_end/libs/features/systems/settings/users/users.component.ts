import {
    Component,
    OnDestroy,
    OnInit
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { NxSettingsService } from '../settings.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss'],
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    CONFIG: IConfig;

    before5dot2: boolean = false;
    fiveDot2Plus: boolean = false;

    constructor(
        configService: NxConfigService,
        private settingsService: NxSettingsService
    ) {
        this.CONFIG = configService.getConfig();
    }

    public ngOnInit(): void {
        this.settingsService.systemSubject$
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined),
            )
            .subscribe(system => {
                // users with groups
                if (system.version >= 5.2 && this.CONFIG.featureFlags.usersWithGroups) {
                    this.fiveDot2Plus = true;
                } else {
                    // users with roles
                    this.before5dot2 = true;
                }
            });
    }

    ngOnDestroy(): void {}
}
