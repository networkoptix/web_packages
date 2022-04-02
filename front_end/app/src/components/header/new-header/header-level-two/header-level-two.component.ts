import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-header-level-two',
    templateUrl: './header-level-two.component.html',
    styleUrls: ['./header-level-two.component.scss']
})
export class NxHeaderLevelTwoComponent {
    @Input() subNodes: MenuNode[];
    CONFIG: IConfig;

    constructor(configService: NxConfigService, public headerService: NxHeaderService) {
        this.CONFIG = configService.getConfig();
    }
}
