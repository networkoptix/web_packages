import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxNavDropdownComponent } from '@components/header/nav-dropdown/nav-dropdown.component';
import { environment } from '@environments/environment';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-header-tabs',
    templateUrl: './tabs.component.html',
    styleUrls: [environment.isLocal ? './tabs-webadmin.component.scss' : './tabs.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, NxNavDropdownComponent, TranslateModule],
})
export class NxTabsComponent {
    @Input() node: MenuNode;
    constructor(public headerService: NxHeaderService) {}
}
