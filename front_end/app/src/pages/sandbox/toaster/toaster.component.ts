import { Component } from '@angular/core';

import { IConfig } from '@services/nx-config/config-types';
import { NxMenuService } from '@src/menu/menu.service';

import { NxDialogsService } from '../../../dialogs/dialogs.service';
import { NxConfigService } from '../../../services/nx-config/nx-config.service';

@Component({
    selector: 'toaster',
    templateUrl: 'toaster.component.html',
    styleUrls: ['toaster.component.scss']
})
export class ToasterComponent {
    CONFIG: IConfig;
    autohide: boolean;

    constructor(
        configService: NxConfigService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'toaster';
    }

    notify(msg: string, type: string): void {
        this.dialogs.notify(msg, type, !this.autohide);
    }

    click(): void {
        alert('CLICK!');
    }
}
