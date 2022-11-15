import {
    Component,
    Input,
    OnChanges,
    OnInit,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { MenuNode } from '@services/menus.service.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NgChanges } from '@utils/ng-changes';

enum mainButtonState {
    ALL = 'all',
    NODE = 'node',
    SYSTEM = 'system',
    SYSTEMS = 'systems'
}

@UntilDestroy()
@Component({
    selector: 'nx-header-main-button',
    templateUrl: 'main-button.component.html',
    styleUrls: [environment.isLocal ? 'main-button-webadmin.component.scss' : 'main-button.component.scss']
})
export class NxHeaderMainButtonComponent implements OnInit, OnChanges {
    @Input() endpoint: any;
    @Input() systems: any[];
    @Input() node: MenuNode;
    @Input() hideArrow = false;
    @Input() maxWidth = 175;
    CONFIG: IConfig;
    readonly environment = environment;
    LANG = staticLang;

    systemCounter: number;
    state: string;

    constructor(
        configService: NxConfigService,
        public headerService: NxHeaderService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.systemCounter = this.systems?.length ?? 0;
    }

    ngOnChanges(changes: NgChanges<NxHeaderMainButtonComponent>): void {
        this.systemCounter = this.systems?.length ?? 0;
    }

    getState() {
        //  TODO: Refine state when adding header mechanics
        let state = mainButtonState.ALL;
        if (this.environment.isLocal) {
            state = mainButtonState.SYSTEM;
        } else if (
            this.node &&
            !this.headerService.currentLocation.isSystem
        ) {
            state = mainButtonState.NODE;
        } else if (
            this.headerService.currentLocation.isSystem &&
            this.headerService.activeSystem
        ) {
            state = mainButtonState.SYSTEM;
        } else if (
            this.headerService.currentLocation.isSystem &&
            this.systems
        ) {
            state = mainButtonState.SYSTEMS;
        }
        return state;
    }

    get icon() {
        const iconsDir = this.CONFIG.icons.dir;
        switch (this.getState()) {
            case mainButtonState.NODE:
                return iconsDir + 'menu.svg';
            case mainButtonState.SYSTEM:
                return iconsDir + 'menu_system.svg';
            default:
                return iconsDir + 'menu.svg';
        }
    }
}
