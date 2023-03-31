import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';

import { icons } from '@lib/variables/static-variables';

import { GroupItem, GroupsItem, OpenGroups } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups.actions';
import { selectCurrentGroupId } from '../../store/groups.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-sidebar-level',
    templateUrl: 'sidebar-level.component.html',
    styleUrls: ['sidebar-level.component.scss'],
})
export class NxGroupsSidebarLevelComponent {
    @Input() groups: GroupItem[];
    @Input() userLevel: string;
    @Input() openGroups: OpenGroups;
    @Input() groupId: string;

    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);

    icons = icons;

    constructor(
        private groupsService: NxSystemGroupsService,
        private store: Store,
        private router: Router,
    ) {}

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

    selectUserFilter(user: string): void {
        this.router
            .navigate(['/', 'groups'])
            .then(() =>
                this.store.dispatch(
                    GroupActions.setCurrentSharedOwner({ currentSharedOwner: user }),
                ),
            );
    }

    toggleOpenState(groupId?: string): boolean | void {
        const updatedState: OpenGroups = {};

        if (!groupId) {
            updatedState[this.groupId] = true;
        }
        // exists in open groups already
        if (this.openGroups[groupId] !== undefined) {
            updatedState[groupId] = !this.openGroups[groupId];
        } else {
            updatedState[groupId] = true;
        }

        this.openGroups = { ...this.openGroups, ...updatedState };
        this.store.dispatch(GroupActions.setOpenGroups({ openGroups: updatedState }));
    }
}
