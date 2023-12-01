import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-active-system',
    templateUrl: 'active-system.component.html',
    styleUrls: ['active-system.component.scss'],
    imports: [CommonModule, RouterModule, NxArrowNavDirective, NxClickElsewhereDirective],
    standalone: true,
})
export class NxActiveSystemDropdown extends BaseDropdown {
    @Input() activeSystem;

    canViewInfo: boolean;
    params;
    show: boolean;
    active = {
        health: false,
        settings: false,
        view: false,
    };

    constructor(private router: Router) {
        super();
    }

    updateActiveByUri(): void {
        this.updateActive(this.router.url.split('/').filter(String)[2]); // .filter(String) <- remove leading "/"
    }

    updateActive(endpoint = 'settings'): void {
        this.active.health = endpoint === 'health';
        this.active.view = endpoint === 'view';
        this.active.settings = endpoint === 'settings';
    }

    ngOnInit(): void {
        this.updateActiveByUri();
        this.show = false;
    }

    ngOnChanges(changes: NgChanges<NxActiveSystemDropdown>): void {
        if (changes.activeSystem) {
            if (!('id' in changes.activeSystem.currentValue)) {
                this.activeSystem = { id: '0' }; // Avoid JS timing error (in console)
            } else if (changes.activeSystem.currentValue.id !== '0') {
                this.canViewInfo = this.CONFIG.accessRoles.adminAccess.includes(
                    changes.activeSystem.currentValue.accessRole.toLowerCase(),
                );
            }
        }
    }
}
