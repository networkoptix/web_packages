import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';
import { NgChanges } from '@utils/ng-changes';

import { logoAreaState, logoClickType } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-logo-area',
    templateUrl: './logo-area.component.html',
    styleUrls: ['./logo-area.component.scss']
})
export class NxHeaderLogoAreaComponent implements OnInit {
    @Input() isMobile = false;
    @Input() menuOpen = false;
    @Input() isProfile = false;
    @Output() logoClick = new EventEmitter<'system' | 'systems-list'>();
    CONFIG: IConfig;
    LANG = staticLang;
    logoState = logoAreaState.LOGO;
    systemListText: string;
    singleSystem = false;

    constructor(
        configService: NxConfigService,
        systemsService: NxSystemsService,
        public headerService: NxHeaderService,
    ) {
        this.CONFIG = configService.getConfig();
        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            this.checkLogoState(currentLocation);
        });
        systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
            this.singleSystem = systems.length === 1;
        });
    }

    ngOnInit(): void {
        this.systemListText = this.isMobile ? this.LANG.appHeader.mySystems : this.LANG.appHeader.systemList;
    }

    emitClick(clickType: logoClickType): void {
        this.logoClick.emit(clickType);
    }

    checkLogoState(currentLocation): void {
        let newLogoState = logoAreaState.LOGO;
        if (currentLocation?.path === '/systems') {
            newLogoState = logoAreaState.SYSTEMS;
        } else if (this.headerService.activeSystem && currentLocation?.path?.includes('/systems/')) {
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
        if (changes.menuOpen?.currentValue !== changes.menuOpen?.previousValue ||
            changes.isProfile?.currentValue !== changes.isProfile?.previousValue) {
            this.checkLogoState(this.headerService.currentLocation);
        }
    }
}
