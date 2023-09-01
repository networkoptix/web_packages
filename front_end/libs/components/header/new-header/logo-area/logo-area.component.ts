import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';
import { combineLatest, map } from 'rxjs';

import { accountSelectors } from '@common/store/account';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
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
    @Output() logoClick = new EventEmitter<'system' | 'systems-list'>();
    readonly environment = environment;
    CONFIG: IConfig;
    loggedIn: boolean;
    LANG = staticLang;
    logoState = logoAreaState.LOGO;
    singleSystem = false;
    icons = icons;
    images = images;
    mainUrl$ = combineLatest([
        this.store.select(accountSelectors.selectIsAuthenticated),
        this.headerService.activeSystem$,
    ]).pipe(map(info => this.getMainUrl(...info)));

    activeSystemName$$ = signal<string>('');

    constructor(
        public headerService: NxHeaderService,
        systemsService: NxSystemsService,
        configService: NxConfigService,
        private store: Store,
        private cookieService: CookieService,
    ) {
        this.CONFIG = configService.getConfig();
        this.headerService.currentLocation$
            .pipe(untilDestroyed(this))
            .subscribe(currentLocation => {
                this.checkLogoState(currentLocation);
            });
        systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
            this.singleSystem = systems.length === 1;
        });
    }

    getMainUrl(isAuthenticated: boolean, activeSystem: NxSystem): string {
        if (!isAuthenticated) {
            return '/';
        }

        if (activeSystem) {
            this.activeSystemName$$.set(activeSystem?.info?.name || '');
        }

        if (this.singleSystem && activeSystem?.id) {
            return `/systems/${this.headerService.activeSystem.id}/view`;
        }

        return this.CONFIG.featureFlags.dashboardRedirect || this.cookieService.get('devServer')
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
