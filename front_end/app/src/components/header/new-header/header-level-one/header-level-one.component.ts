import { Component, Input, Output, EventEmitter } from '@angular/core';

import type { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

@Component({
    selector: 'nx-header-level-one',
    templateUrl: './header-level-one.component.html',
    styleUrls: ['./header-level-one.component.scss']
})
export class NxHeaderLevelOneComponent {
    @Input() menuNodes: MenuNode[] = [];
    @Input() selectedNode: MenuNode;
    @Input() displayedName: string;
    @Output() nodeSelect = new EventEmitter<MenuNode>();
    CONFIG: IConfig;

    constructor(public headerService: NxHeaderService, configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    onNodeSelect(event: MenuNode): void {
        this.nodeSelect.emit(event);
    }

    handleNavigation(node: MenuNode, event: MouseEvent) {
        const firstNodeWithURL = node.nodes.find(subNode => (subNode.url && !subNode.new_window));
        if (firstNodeWithURL) {
            this.headerService.handleNav(firstNodeWithURL, event);
        }
    }
}
