import { Component, Input }  from '@angular/core';
import { NxDialogsService }  from '../../dialogs/dialogs.service';
import { NxUriService }      from '../../services/uri.service';
import { NxMenuService }     from '../menu.service';

// TODO: Do we really need this? -- TT
@Component({
    selector : 'nx-menu-button',
    template : `<button class="inset btn btn-menu btn-clear"
                       [disabled]="button.disabled"
                       (click)="action()">{{caption}}</button>`
})
export class NxMenuButtonComponent {
    @Input() button;
    @Input() system;

    caption: string

    constructor(
        private dialogs: NxDialogsService,
        private uriService: NxUriService,
        private menuService: NxMenuService
    ) {}

    ngOnInit() {
        this.caption = (typeof this.button.label === 'function') ? this.button.label() : this.button.label;
    }

    action() {
        if (this.button.id === 'addUser') {
            // Handling promise to satisfy the linter.
            this.dialogs.addUser(this.system)
                .then((userId) => {
                    if (userId) {
                        userId = this.system.mediaserver.cleanId(userId);
                        this.menuService.detail = userId;

                        this.uriService
                            .updateURI(`systems/${this.system.id}/users/${userId}`)
                            .catch(error => console.error(error));
                    }
                })
                .catch(err => console.error(err));
        }
    }
}
