import { Component } from '@angular/core';

import { NxDialogsService } from '../../../dialogs/dialogs.service';
import { NxMenuService } from '../../../menu';

@Component({
    selector: 'toaster',
    templateUrl: 'toaster.component.html',
    styleUrls: ['toaster.component.scss']
})
export class ToasterComponent {
    autohide: boolean;

    constructor(
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit() {
        this.menuService.section = 'components';
        this.menuService.detail = 'taster';
    }

    notify(msg: string, type: string) {
        this.dialogs.notify(msg, type, this.autohide);
    }
}
