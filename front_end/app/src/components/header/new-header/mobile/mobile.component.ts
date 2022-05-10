import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NgChanges } from '@utils/ng-changes';

import { mobileIconState } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-mobile',
    templateUrl: './mobile.component.html',
    styleUrls: ['./mobile.component.scss']
})
export class NxHeaderMobileComponent {
    @Input() loggedIn: boolean;
    iconState: any;
    CONFIG: IConfig;
    constructor(configService: NxConfigService, public headerService: NxHeaderService) {
        this.CONFIG = configService.getConfig();

        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            this.setIconState(this.loggedIn, currentLocation?.path);
        });
    }

    ngOnChanges(changes: NgChanges<NxHeaderMobileComponent>) {
        if (changes.loggedIn?.currentValue) {
            this.setIconState(changes.loggedIn.currentValue, this.headerService.currentLocation?.path);
        }
    }

    setIconState(loggedIn: boolean, path: string): void {
        let state = mobileIconState.CREATE_ACCOUNT;
        if (loggedIn) {
            state = mobileIconState.PROFILE;
            if (path === '/systems') {
                state = mobileIconState.NONE;
            } else if (this.headerService.activeSystem && path?.includes('/systems/')) {
                state = mobileIconState.RETURN_TO_SYSTEMS;
            }
        }
        this.iconState = state;
    }
}
