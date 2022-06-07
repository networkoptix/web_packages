import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
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
    @Output() logoClick = new EventEmitter<'system' | 'systems-list'>();
    CONFIG: IConfig;
    logoState = logoAreaState.LOGO;
    systemListText = 'System List';
    constructor(public headerService: NxHeaderService, configService: NxConfigService) {
        this.CONFIG = configService.getConfig();

        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            this.checkLogoState(currentLocation);
        });
    }

    ngOnInit() {
        if (this.isMobile) {
            this.systemListText = 'My Systems';
        }
    }

    emitClick(clickType: logoClickType): void {
        this.logoClick.emit(clickType);
    }

    checkLogoState(currentLocation) {
        let newLogoState = logoAreaState.LOGO;
        if (currentLocation?.path === '/systems') {
            newLogoState = logoAreaState.SYSTEMS;
        } else if (this.headerService.activeSystem && currentLocation?.path?.includes('/systems/')) {
            newLogoState = logoAreaState.SYSTEM;
        } else if (this.isMobile && this.menuOpen) {
            newLogoState = logoAreaState.MOBILE_OPEN;
        }
        this.logoState = newLogoState;
    }

    ngOnChanges(changes: NgChanges<NxHeaderLogoAreaComponent>) {
        if (changes.menuOpen?.currentValue !== changes.menuOpen?.previousValue) {
            this.checkLogoState(this.headerService.currentLocation);
        }
    }
}
