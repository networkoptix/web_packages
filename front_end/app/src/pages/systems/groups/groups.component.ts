import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';

import { NxDialogsService } from '@dialogs/dialogs.service';

import type { GroupItem, GroupsItem, SystemItem, Crumb } from './groups.types';
import { NxSystemGroupsService } from './services/system-groups.service';
import * as GroupActions from './store/groups.actions';
import {
    selectCrumbs,
    selectCurrentGroupItems,
    selectCurrentIndexes,
    selectCurrentSystemItems,
    selectRootGroupItems,
    selectRootSystemItems,
} from './store/groups.selectors';

@Component({
    selector: 'nx-groups',
    templateUrl: 'groups.component.html',
    styleUrls: ['groups.component.scss']
})
export class NxSystemGroupsComponent {
    rootGroups$ = this.store.select<GroupItem[] | undefined>(
        selectRootGroupItems
    );
    rootSystems$ = this.store.select<SystemItem[] | undefined>(
        selectRootSystemItems
    );

    currentGroups$ = this.store.select<GroupItem[] | null>(
        selectCurrentGroupItems
    );
    currentSystems$ = this.store.select<SystemItem[] | null>(
        selectCurrentSystemItems
    );
    currentIndexes$ = this.store.select<number[] | null | undefined>(
        selectCurrentIndexes
    );
    crumbs$ = this.store.select<Crumb[] | null>(selectCrumbs);

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.store.dispatch(
                GroupActions.setCurrentGroupId({
                    currentGroupId: params.groupId
                })
            );
        });
    }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

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
