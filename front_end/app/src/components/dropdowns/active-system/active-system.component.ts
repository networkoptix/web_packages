import { Component, OnInit, Input, OnDestroy, SimpleChanges, OnChanges } from '@angular/core';
import { Location }                                                      from '@angular/common';
import { NxConfigService } from '../../../services/nx-config';


@Component({
    selector: 'nx-active-system',
    templateUrl: 'active-system.component.html',
    styleUrls: ['active-system.component.scss']
})

export class NxActiveSystemDropdown implements OnInit, OnDestroy, OnChanges {
    @Input() activeSystem: any;
    CONFIG: any;

    active = {
        health: false,
        settings: false,
        view: false,
    };
    canViewInfo: boolean;
    params: any;
    show: boolean;

    constructor(private config: NxConfigService,
                private location: Location) {
        this.CONFIG = this.config.getConfig();
        this.show = false;
    }

    private isActive(val) {
        return (this.location.path().indexOf(val) >= 0);
    }

    private updateActive() {
        this.active.health = this.isActive('/health');
        this.active.view = this.isActive('/view');
        this.active.settings = !(this.active.view || this.active.health);
        this.show = false;
    }

    ngOnInit(): void {
        this.updateActive();
    }

    ngOnDestroy() {
    }

    ngOnChanges(changes: SimpleChanges) {
        this.updateActive();
        if (changes.activeSystem) {
            if (changes.activeSystem.currentValue === undefined) {
                this.activeSystem = {id: '0'}; // Avoid JS timing error (in console)
            } else {
                this.canViewInfo = this.CONFIG.accessRoles.adminAccess
                    .includes(changes.activeSystem.currentValue.accessRole.toLowerCase());
            }
        }
    }
}
