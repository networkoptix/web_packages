import { Component, Input }  from '@angular/core';

import { NxDialogsService }  from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { NxMenuService } from '@src/menu/menu.service';

import type { Level2Button } from '../menu.types';

@Component({
    selector: 'nx-menu-button',
    template: `<button
        *ngIf="!environment.isLocal ||
            CONFIG.cloudSystemId ||
            button.id !== 'addUser'"
        class="inset btn btn-menu btn-clear"
        [disabled]="button.disabled"
        (click)="action()"
    >{{caption}}</button>`
})
export class NxMenuButtonComponent {
    @Input() button: Level2Button;
    @Input() system: NxSystem;

    caption: string;
    CONFIG: IConfig;
    readonly environment = environment;

    constructor(
        private dialogs: NxDialogsService,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        configService: NxConfigService
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {
        this.caption = (typeof this.button.label === 'function')
            ? this.button.label()
            : this.button.label;
    }

    action(): void {
        if (this.button.id === 'addUser') {
            // Handling promise to satisfy the linter.
            this.dialogs.addUser(this.system)
                .then((userId: string) => {
                    if (userId) {
                        const systemId = this.system.id;
                        userId = this.system.mediaserver.cleanId(userId);
                        this.menuService.detail = userId;
                        this.uriService
                            .updateURI(this.uriService.getSystemSettingsRoute({
                                systemId,
                                userId
                            }))
                            .catch(error => console.error(error));
                    }
                })
                .catch(err => console.error(err));
        }
    }
}
