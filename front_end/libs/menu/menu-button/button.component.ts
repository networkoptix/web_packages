import { Component, Input } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxMenuService } from '@menu/menu.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { cleanIdLegacy } from '@utils/general';

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
                            userId = cleanIdLegacy(userId);
                            this.menuService.selectedDetailsSection$$.set(userId);
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
            // case 'addPartner':
            //     this.dialogs.addChannelPartner().then(partnerId => {
            //         if (partnerId) {
            //             this.menuService.selectedDetailsSection.set(partnerId.toString());
            //             // this.uriService
            //             //     .updateURI('/partners/' + customizationId, {})
            //             //     .catch(error => console.error(error));
            //         }
            //     });
        }
    }
}
