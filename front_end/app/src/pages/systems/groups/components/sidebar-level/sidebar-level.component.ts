import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnChanges } from '@angular/core';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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

    CONFIG: IConfig;
    openState: Record<string, boolean> = {};

    constructor(
        configService : NxConfigService,
        private groupsService: NxSystemGroupsService,
    ) {
        this.CONFIG = configService.getConfig();
    }

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
        if (!event.isPointerOverContainer) {
            return;
        }

        this.groupsService.onDrop(dragged, droppedOn);
    }
}
