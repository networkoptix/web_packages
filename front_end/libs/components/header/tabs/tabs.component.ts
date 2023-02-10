import { Component, Input } from '@angular/core';

import { environment } from '@environments/environment';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-header-tabs',
    templateUrl: './tabs.component.html',
    styleUrls: [environment.isLocal ? './tabs-webadmin.component.scss' : './tabs.component.scss'],
})
export class NxTabsComponent {
    @Input() node: MenuNode;
    constructor(public headerService: NxHeaderService) {}
}
