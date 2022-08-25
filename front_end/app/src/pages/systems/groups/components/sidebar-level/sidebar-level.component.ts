import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnChanges } from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

import { GroupItem, GroupsItem, SystemItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

@Component({
    selector: 'nx-sidebar-level',
    templateUrl: 'sidebar-level.component.html',
    styleUrls: ['sidebar-level.component.scss']
})
export class NxGroupsSidebarLevelComponent implements OnChanges {
    @Input() groups: GroupItem[];
    @Input() systems: SystemItem[];

    openState: Record<string, boolean> = {};

    constructor(
        private groupsService: NxSystemGroupsService,
    ) {}

    ngOnChanges({ groups }: NgChanges<NxGroupsSidebarLevelComponent>): void {
        if (groups.currentValue) {
            this.openState = Object.fromEntries(
                groups.currentValue.map(g => [
                    g.id,
                    this.openState[g.id] ?? false
                ])
            );
        }
    }

    trackItem(_index: number, item: GroupsItem): string {
        return item.id;
    }

    onDrop(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        if (
            !event.isPointerOverContainer ||
            dragged.id === droppedOn.id ||
            droppedOn.type === 'system'
        ) {
            return;
        }

        if (dragged.type === 'group') {
            this.groupsService.moveGroup(dragged.id, droppedOn.id);
        } else if (dragged.type === 'system') {
            this.groupsService.moveSystem(dragged.id, droppedOn.id);
        }
    }
}
