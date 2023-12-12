import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BehaviorSubject } from 'rxjs';

import { NxHeaderLogoAreaComponent } from '@components/header/new-header/logo-area/logo-area.component';
import { NxMobileHeaderMenuComponent } from '@components/header/new-header/mobile/mobile-menu/mobile-menu.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { icons } from '@static-variables';
import { GridBreakpoints } from '@styles/theme-variables-common';
import { NgChanges } from '@utils/ng-changes';

import { mobileIconState } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-mobile',
    templateUrl: './mobile.component.html',
    styleUrls: ['./mobile.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        NxHeaderLogoAreaComponent,
        NxMobileHeaderMenuComponent,
        NxAddSvgSrcDirective,
    ],
})
export class NxHeaderMobileComponent {
    @Input() loggedIn: boolean;
    @Input() menuNodes: MenuNode[] = [];
    @Input() systemCount: number = 0;
    menuOpen$ = new BehaviorSubject(false);
    isProfile$ = new BehaviorSubject(false);
    isTablet$ = new BehaviorSubject(false);
    currentSystemMenu: MenuNode;
    iconState: mobileIconState;
    icons = icons;
    constructor(
        public headerService: NxHeaderService,
        scrollMechanics: NxScrollMechanicsService,
    ) {
        this.headerService.currentLocation$
            .pipe(untilDestroyed(this))
            .subscribe(currentLocation => {
                this.setIconState(this.loggedIn, currentLocation?.path);
            });

        this.menuOpen$.pipe(untilDestroyed(this)).subscribe(() => {
            this.setIconState(this.loggedIn, this.headerService.currentLocation?.path);
        });

        scrollMechanics.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(({ width }) => {
            this.isTablet$.next(width < GridBreakpoints.MD && width > GridBreakpoints.SM);
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
            this.setIconState(
                changes.loggedIn.currentValue,
                this.headerService.currentLocation?.path,
            );
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
                    if (this.systemCount > 1) {
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
