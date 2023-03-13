import { Component, Input } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';

import type { Level2Button } from '../menu.types';

@Component({
    selector: 'nx-menu-button',
    template: `<button
        *ngIf="!environment.isLocal || CONFIG.cloudSystemId"
        class="inset btn btn-menu btn-clear"
        [disabled]="button.disabled"
        (click)="action()"
    >
        {{ button.label | translate }}
    </button>`,
})
export class NxMenuButtonComponent {
    @Input() button: Level2Button;
    @Input() system: NxSystem;

    CONFIG: IConfig;
    readonly environment = environment;

    constructor(
        private dialogs: NxDialogsService,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        configService: NxConfigService,
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {}

    action(): void {
        switch (this.button.id) {
            case 'addUser':
                // Handling promise to satisfy the linter.
                this.dialogs
                    .addUser(this.system)
                    .then(userId => {
                        if (userId) {
                            const systemId = this.system.id;
                            userId = this.system.mediaserver.cleanId(userId);
                            this.menuService.detail = userId;
                            this.uriService
                                .updateURI(
                                    this.uriService.getSystemSettingsRoute({
                                        systemId,
                                        userId,
                                    }),
                                )
                                .catch(error => console.error(error));
                        }
                    })
                    .catch(err => console.error(err));
                break;
            case 'addCustomization':
                this.dialogs.addPartnerBrand().then(customizationId => {
                    if (customizationId) {
                        const idStr = customizationId.toString();
                        this.menuService.detail = idStr;
                        this.uriService
                            .updateURI('/partners/' + idStr, {})
                            .catch(error => console.error(error));
                    }
                });
                break;
            case 'addPartner':
                this.dialogs.addBrandPartner().then(partnerId => {
                    if (partnerId) {
                        this.menuService.detail = partnerId.toString();
                        // this.uriService
                        //     .updateURI('/partners/' + customizationId, {})
                        //     .catch(error => console.error(error));
                    }
                });
        }
    }
}
