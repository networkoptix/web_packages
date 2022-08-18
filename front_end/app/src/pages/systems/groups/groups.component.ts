import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import { NxDialogsService } from '@dialogs/dialogs.service';

import type { GroupItem, GroupsItem, SystemItem } from './groups.types';
import { NxSystemGroupsService } from './services/system-groups.service';
import {
    selectRootGroupItems,
    selectRootSystemItems
} from './store/groups.selectors';

@Component({
    selector: 'nx-groups',
    templateUrl: 'groups.component.html',
    styleUrls: ['groups.component.scss']
})
export class NxSystemGroupsComponent {
    rootGroups$ = this.store.select<GroupItem[]>(selectRootGroupItems);
    rootSystems$ = this.store.select<SystemItem[]>(selectRootSystemItems);

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
    ) {
        this.groupsService.connect();
    }

    // ngOnInit(): void {}

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        const dragged = event.item.data;

        if (dragged.type === 'group') {
            this.groupsService.moveGroup(dragged.id, null);
        } else if (dragged.type === 'system') {
            this.groupsService.moveSystem(dragged.id, null);
        }
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup();
    }
}
