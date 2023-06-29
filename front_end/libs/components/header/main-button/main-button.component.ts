import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDropMenu } from '@components/dropdowns/drop-menu/drop-menu.component';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NgChanges } from '@utils/ng-changes';

import { mainButtonState } from './main-button.types';

@UntilDestroy()
@Component({
    selector: 'nx-header-main-button',
    templateUrl: 'main-button.component.html',
    styleUrls: [
        environment.isLocal ? 'main-button-webadmin.component.scss' : 'main-button.component.scss',
    ],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, NxDropMenu],
})
export class NxHeaderMainButtonComponent implements OnInit, OnChanges {
    @Input() endpoint: any;
    @Input() systems: any[];
    @Input() node: MenuNode;
    @Input() hideArrow = false;
    @Input() maxWidth = 175;
    readonly environment = environment;
    LANG = staticLang;

    systemCounter: number;
    state: string;
    icons = icons;

    constructor(public headerService: NxHeaderService) {}

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
        } else if (this.node && !this.headerService.currentLocation.isSystem) {
            state = mainButtonState.NODE;
        } else if (this.headerService.currentLocation.isSystem && this.headerService.activeSystem) {
            state = mainButtonState.SYSTEM;
        } else if (this.headerService.currentLocation.isSystem && this.systems) {
            state = mainButtonState.SYSTEMS;
        }
        return state;
    }

    get icon() {
        const iconsDir = icons.dir;
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
