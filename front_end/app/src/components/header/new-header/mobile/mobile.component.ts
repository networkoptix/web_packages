import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { MenuNode } from '@services/menus.service.types';
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
    @Input() menuNodes: MenuNode[] = [];
    menuOpen$ = new BehaviorSubject(false);
    isProfile$ = new BehaviorSubject(false);
    iconState: mobileIconState;
    CONFIG: IConfig;
    constructor(configService: NxConfigService, public headerService: NxHeaderService) {
        this.CONFIG = configService.getConfig();

        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            this.setIconState(this.loggedIn, currentLocation?.path);
        });

        this.menuOpen$.pipe(untilDestroyed(this)).subscribe(() => {
            this.setIconState(this.loggedIn, this.headerService.currentLocation?.path);
        });
    }

    toggleMenuOpen(): void {
        this.isProfile$.next(false);
        this.menuOpen$.next(!this.menuOpen$.value);
    }

    openProfile(): void {
        this.isProfile$.next(true);
        this.menuOpen$.next(true);
        this.setIconState(this.loggedIn, this.headerService.currentLocation?.path);
    }

    ngOnChanges(changes: NgChanges<NxHeaderMobileComponent>): void {
        if (changes.loggedIn?.currentValue) {
            this.setIconState(changes.loggedIn.currentValue, this.headerService.currentLocation?.path);
        }
    }

    setIconState(loggedIn: boolean, path: string): void {
        let state = mobileIconState.CREATE_ACCOUNT;
        if (loggedIn) {
            state = mobileIconState.PROFILE;
            if (!this.menuOpen$.value) {
                if (path === '/systems') {
                    state = mobileIconState.NONE;
                } else if (this.headerService.activeSystem && path?.includes('/systems/')) {
                    state = mobileIconState.RETURN_TO_SYSTEMS;
                }
            }
        }
        if (this.isProfile$.value && this.menuOpen$.value) {
            state = mobileIconState.RETURN;
        }
        this.iconState = state;
    }
}
