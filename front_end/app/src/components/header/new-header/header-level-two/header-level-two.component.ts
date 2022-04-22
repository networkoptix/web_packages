import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

import { logoAreaState } from '../new-header-types';

@UntilDestroy()
@Component({
    selector: 'nx-header-level-two',
    templateUrl: './header-level-two.component.html',
    styleUrls: ['./header-level-two.component.scss']
})
export class NxHeaderLevelTwoComponent {
    @Input() subNodes: MenuNode[];
    @Output() systemNav = new EventEmitter<Boolean>();
    CONFIG: IConfig;
    logoState = logoAreaState.LOGO;

    constructor(configService: NxConfigService,
                public headerService: NxHeaderService,
                private menusService: NxMenusService) {
        this.CONFIG = configService.getConfig();
        this.headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(currentLocation => {
            let newLogoState = logoAreaState.LOGO;
            if (currentLocation?.path === '/systems') {
                newLogoState = logoAreaState.SYSTEMS;
            } else if (this.headerService.activeSystem && currentLocation?.path?.includes('/systems/')) {
                newLogoState = logoAreaState.SYSTEM;
            }
            this.logoState = newLogoState;
        });
    }

    setMenuToCurrentSystem = (activeSystem: any): void => {
        this.menusService.updateActiveSystemMenu(activeSystem);
        this.subNodes = this.menusService.currentSystemNode$?.value?.nodes;
    };

    onSystemListNav(): void {
        this.systemNav.emit(true);
    }
}
