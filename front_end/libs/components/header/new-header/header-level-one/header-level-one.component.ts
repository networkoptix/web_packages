import { Component, Input, Output, EventEmitter } from '@angular/core';

import { NxMenusService } from '@services/menus.service';
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
    @Input() loggedIn: boolean | undefined = undefined;
    @Output() nodeSelect = new EventEmitter<MenuNode>();
    profileDropdownOpen = false;

    constructor(public headerService: NxHeaderService, private menusService: NxMenusService) {}

    onNodeSelect(event: MenuNode): void {
        this.nodeSelect.emit(event);
    }

    handleNavigation(node: MenuNode, event: MouseEvent): void {
        const firstNodeWithURL = node.nodes.find(subNode => (subNode.url && !subNode.new_window));
        if (firstNodeWithURL) {
            let navNode = firstNodeWithURL;
            if (firstNodeWithURL.url === '/systems') {
                if (this.menusService.currentSystemNode$.value) {
                    navNode = this.menusService.currentSystemNode$.value;
                }
            }
            this.headerService.handleNav(navNode, event);
        }
    }
}
