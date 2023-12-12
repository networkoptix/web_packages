import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import {
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { OpenGroups } from '../../home.types';
import * as GroupActions from '../../store/groups/groups.actions';
import { selectCurrentGroupId } from '../../store/groups/groups.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-sidebar-level',
    templateUrl: 'sidebar-level.component.html',
    styleUrls: ['sidebar-level.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        CdkMenuModule,
        AsyncPipe,
        AngularSvgIconModule,
        DragDropModule,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
    ],
})
export class NxGroupsSidebarLevelComponent {
    @Input() groups: GroupItem[];
    @Input() openGroups: OpenGroups;
    @Input() groupId: string;
    @Input() rootOrg: Organization;

    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);

    icons = icons;
    constructor(
        private store: Store,
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    trackItem(_index: number, item: GroupItem): string {
        return item.id;
    }

    onDrop(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
        // const dragged = event.item.data;
        // const droppedOn = event.container.data;
        // if (!event.isPointerOverContainer) {
        //     return;
        // }
        // Todo: Update group from service
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

    toRoot(): void {
        this.router.navigate(['./'], { relativeTo: this.route });
    }
}
