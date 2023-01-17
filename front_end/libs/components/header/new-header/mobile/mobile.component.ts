import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { icons } from '@lib/variables/static-variables';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSystemsService } from '@services/systems.service';
import { GridBreakpoints } from '@styles/theme-variables-common';
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
    isTablet$ = new BehaviorSubject(false);
    singleSystem$ = new BehaviorSubject(false);
    currentSystemMenu: MenuNode;
    iconState: mobileIconState;
    icons = icons;
    constructor(public headerService: NxHeaderService,
        systemsService: NxSystemsService,
        scrollMechanics: NxScrollMechanicsService) {
        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            this.setIconState(this.loggedIn, currentLocation?.path);
        });

        this.menuOpen$.pipe(untilDestroyed(this)).subscribe(() => {
            this.setIconState(this.loggedIn, this.headerService.currentLocation?.path);
        });

        scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(({ width }) => {
            this.isTablet$.next(width < GridBreakpoints.MD && width > GridBreakpoints.SM);
        });

        systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
            this.singleSystem$.next(systems.length === 1);
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
                    if (!this.singleSystem$.value) {
                        state = mobileIconState.RETURN_TO_SYSTEMS;
                    } else {
                        state = mobileIconState.NONE;
                    }
                }
            }
        }
        if (this.isProfile$.value && this.menuOpen$.value) {
            state = mobileIconState.RETURN;
        }
        this.iconState = state;
    }
}
