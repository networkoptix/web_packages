import { Component, Input }  from '@angular/core';
import { IConfig, NxConfigService } from '@services/nx-config';

import { NxDialogsService }  from '@dialogs/dialogs.service';
import { NxUriService }      from '@services/uri.service';
import { NxMenuService }     from '../menu.service';

// TODO: Do we really need this? -- TT
@Component({
    selector : 'nx-menu-button',
    template : `<button *ngIf="!CONFIG.isLocal || CONFIG.cloudSystemId|| button.id !== 'addUser'"
                    class="inset btn btn-menu btn-clear"
                    [disabled]="button.disabled"
                    (click)="action()">{{caption}}</button>`
})
export class NxMenuButtonComponent {
    @Input() button;
    @Input() system;

    caption: string;
    CONFIG: IConfig;

    constructor(
        private dialogs: NxDialogsService,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        configService: NxConfigService
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
        this.caption = (typeof this.button.label === 'function') ? this.button.label() : this.button.label;
    }

    action() {
        if (this.button.id === 'addUser') {
            // Handling promise to satisfy the linter.
            this.dialogs.addUser(this.system)
                .then((userId: string) => {
                    if (userId) {
                        const systemId = this.system.id;
                        userId = this.system.mediaserver.cleanId(userId);
                        this.menuService.detail = userId;
                        this.uriService
                            .updateURI(this.uriService.getSystemSettingsRoute({ systemId, userId }))
                            .catch(error => console.error(error));
                    }
                })
                .catch(err => console.error(err));
        }
    }
}
