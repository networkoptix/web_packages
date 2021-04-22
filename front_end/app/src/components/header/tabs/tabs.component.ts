import { Component, Input, OnInit } from '@angular/core';

import { environment }     from '@environments/environment';
import { MenuNode }        from '@services/menus.service';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector    : 'nx-header-tabs',
    templateUrl : './tabs.component.html',
    styleUrls   : [environment.isLocal ? './tabs-webadmin.component.scss' : './tabs.component.scss']
})
export class NxTabsComponent implements OnInit {
    @Input() node: MenuNode;
    constructor(
        public headerService: NxHeaderService
    ) {}

    ngOnInit() {
        if (environment.isLocal && !this.node.url.startsWith('/#')) {
            this.node.url = '/#' + this.node.url;
        }
    }
}
