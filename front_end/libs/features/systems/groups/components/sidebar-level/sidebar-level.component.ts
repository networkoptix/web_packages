import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';

import { icons } from '@lib/variables/static-variables';
import { NgChanges } from '@utils/ng-changes';

import { GroupItem, GroupsItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups.actions';
import { selectCurrentGroupId } from '../../store/groups.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-sidebar-level',
    templateUrl: 'sidebar-level.component.html',
    styleUrls: ['sidebar-level.component.scss'],
})
export class NxGroupsSidebarLevelComponent implements OnChanges {
    @Input() groups: GroupItem[];
    @Input() userLevel: string;

    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);

    openState: Record<string, boolean> = {};
    icons = icons;

    constructor(
        private groupsService: NxSystemGroupsService,
        private store: Store,
        private router: Router,
    ) {
        groupsService.sidebarOpenSubject
            .pipe(untilDestroyed(this))
            .subscribe(state => this.setAll(state));
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

    private setAll(state: boolean): void {
        Object.keys(this.openState).forEach(k => {
            this.openState[k] = state;
        });
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
        this.router.navigate(['/', 'groups'])
            .then(() => this.store.dispatch(GroupActions.setCurrentSharedOwner({ currentSharedOwner: user })));
    }
}
