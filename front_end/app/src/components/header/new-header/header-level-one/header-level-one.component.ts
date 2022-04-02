import { Component, Input, Output, EventEmitter } from '@angular/core';

import type { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-header-level-one',
    templateUrl: './header-level-one.component.html',
    styleUrls: ['./header-level-one.component.scss']
})
export class NxHeaderLevelOneComponent {
    @Input() menuNodes: MenuNode[] = [];
    @Input() selectedNode: MenuNode;
    @Output() nodeSelect = new EventEmitter<MenuNode>();

    constructor(public headerService: NxHeaderService) { }

    onNodeSelect(event: MenuNode) {
        this.nodeSelect.emit(event);
    }
}
