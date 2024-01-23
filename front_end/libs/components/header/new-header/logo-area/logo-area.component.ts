import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';
import { combineLatest, map } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystem } from '@services/system.service/system';
import { icons, images } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { logoAreaState, logoClickType } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-logo-area',
    templateUrl: './logo-area.component.html',
    styleUrls: ['./logo-area.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
    ],
})
export class NxHeaderLogoAreaComponent implements OnInit {
    @Input() isMobile = false;
    @Input() menuOpen = false;
    @Input() isProfile = false;
    @Input() singleSystem = false;
    @Output() logoClick = new EventEmitter<'system' | 'systems-list'>();
    readonly environment = environment;
    CONFIG = nxConfig;
    loggedIn: boolean;
    LANG = staticLang;
    logoState = logoAreaState.LOGO;
    icons = icons;
    images = images;
    mainUrl$ = combineLatest([
        this.store.select(accountSelectors.selectIsAuthenticated),
        this.headerService.activeSystem$,
    ]).pipe(map(info => this.getMainUrl(...info)));

    activeSystemName$$ = toSignal(
        this.headerService.activeSystem$.pipe(
            filter(Boolean),
            switchMap(system => system.infoSubject),
            map(system => system?.info?.name || ''),
        ),
    );

    constructor(
        public headerService: NxHeaderService,
        private store: Store,
        private cookieService: CookieService,
    ) {
        this.headerService.currentLocation$
            .pipe(untilDestroyed(this))
            .subscribe(currentLocation => {
                this.checkLogoState(currentLocation);
            });
    }

    getMainUrl(isAuthenticated: boolean, activeSystem: NxSystem): string {
        if (!isAuthenticated) {
            return '/';
        }

        if (this.singleSystem && activeSystem?.id) {
            return `/systems/${this.headerService.activeSystem.id}/view`;
        }

        return nxConfig.featureFlags.dashboardRedirect || this.cookieService.get('devServer')
            ? '/dashboard'
            : '/';
    }

    ngOnInit(): void {
        // this.systemListText = this.isMobile ? this.LANG.appHeader.mySystems : this.LANG.appHeader.systemsList;
    }

    emitClick(clickType: logoClickType): void {
        this.logoClick.emit(clickType);
    }

    checkLogoState(currentLocation): void {
        let newLogoState = logoAreaState.LOGO;
        if (this.headerService.activeSystem && currentLocation?.path?.includes('/systems/')) {
            newLogoState = logoAreaState.SYSTEM;
        }
        if (this.isMobile) {
            if (this.menuOpen) {
                if (this.isProfile) {
                    newLogoState = logoAreaState.PROFILE_OPEN;
                } else {
                    newLogoState = logoAreaState.MOBILE_OPEN;
                }
            }
        }
        this.logoState = newLogoState;
    }

    ngOnChanges(changes: NgChanges<NxHeaderLogoAreaComponent>): void {
        if (
            changes.menuOpen?.currentValue !== changes.menuOpen?.previousValue ||
            changes.isProfile?.currentValue !== changes.isProfile?.previousValue
        ) {
            this.checkLogoState(this.headerService.currentLocation);
        }
    }
}
