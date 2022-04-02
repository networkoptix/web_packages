import { Component, Input, OnChanges } from '@angular/core';

import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-new-header',
    templateUrl: './new-header.component.html',
    styleUrls: ['./new-header.component.scss']
})
export class NxNewHeaderComponent implements OnChanges {
    @Input() nodes: MenuNode[];
    selectedNode: MenuNode;

    constructor(private headerService: NxHeaderService) {
    }

    handleNodeSelect(node: MenuNode) {
        if (this.selectedNode !== node) {
            this.selectedNode = node;
        }
    }

    ngOnChanges(changes: NgChanges<NxNewHeaderComponent>) {
        if (changes.nodes) {
            this.selectedNode = changes.nodes.currentValue.find(node => node.nodes.find(subNode => subNode.url === this.headerService.currentLocation?.path));
        }
    }
}
