import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NgChanges } from '@utils/ng-changes';

import { logoAreaState, logoClickType } from '../new-header-types';

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
    optimisticSelectedSubNode: MenuNode; // The selected node is typically controlled by the headerServices currentLocation,
    // but this property is used to make the UI smooth when navigating between nodes while the currentLocation is changing

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

    handleLogoClick(clickType: logoClickType): void {
        if (clickType === 'system') {
            this.menusService.updateActiveSystemMenu(this.headerService.activeSystem);
            this.subNodes = this.menusService.currentSystemNode$?.value?.nodes;
        }
        if (clickType === 'systems-list') {
            this.systemNav.emit(true);
        }
    }

    nodeClick(node: MenuNode, event: any): void {
        this.headerService.handleNav(node, event);
        this.optimisticSelectedSubNode = node;
    }

    ngOnChanges(changes: NgChanges<NxHeaderLevelTwoComponent>): void {
        if (changes.subNodes.currentValue) {
            this.optimisticSelectedSubNode = null;
        }
    }
}
