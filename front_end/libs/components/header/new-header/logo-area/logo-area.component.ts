import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { combineLatest, map } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { accountSelectors } from '@common/store/account';
import { environment } from '@environments/environment';
import { icons, images } from '@lib/variables/static-variables';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { activeSystemType } from '@services/nx-header.service.types';
import { NxSystemsService } from '@services/systems.service';
import { NgChanges } from '@utils/ng-changes';

import { logoAreaState, logoClickType } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-logo-area',
    templateUrl: './logo-area.component.html',
    styleUrls: ['./logo-area.component.scss'],
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

    getMainUrl(isAuthenticated: boolean, activeSystem: activeSystemType): string {
        if (!isAuthenticated) {
            return '/';
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
