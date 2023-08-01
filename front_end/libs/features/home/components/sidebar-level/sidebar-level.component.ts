import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import { icons } from '@lib/variables/static-variables';

import { GroupItem, GroupsItem, OpenGroups } from '../../home.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups/groups.actions';
import { selectCurrentGroupId } from '../../store/groups/groups.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-sidebar-level',
    templateUrl: 'sidebar-level.component.html',
    styleUrls: ['sidebar-level.component.scss'],
    standalone: true,
    imports: [
        CdkMenuModule,
        DirectivesModule,
        NgFor,
        NgIf,
        NgClass,
        AsyncPipe,
        AngularSvgIconModule,
        DragDropModule,
    ],
})
export class NxGroupsSidebarLevelComponent {
    @Input() groups: GroupItem[];
    @Input() openGroups: OpenGroups;
    @Input() groupId: string;

    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);

    icons = icons;

    constructor(
        private groupsService: NxSystemGroupsService,
        private store: Store,
        private router: Router,
        private route: ActivatedRoute,
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

    toGroup(groupId: string): void {
        this.router.navigate(['group', groupId], { relativeTo: this.route });
    }
}
