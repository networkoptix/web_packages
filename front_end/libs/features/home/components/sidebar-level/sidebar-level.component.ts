import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    GroupItem,
    OrgCardItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { OpenGroups } from '../../home.types';
import * as GroupActions from '../../store/groups/groups.actions';
import {
    selectCurrentGroup,
    selectCurrentGroupId,
    selectCurrentSystems,
    selectGroupItems,
} from '../../store/groups/groups.selectors';

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
export class NxGroupsSidebarLevelComponent implements OnInit {
    @Input() groups: GroupItem[];
    @Input() openGroups: OpenGroups;
    @Input() groupId: string;
    @Input() rootOrg: Organization;

    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentGroup$$ = this.store.selectSignal(selectCurrentGroup);
    groupItems$$ = this.store.selectSignal<GroupItem[]>(selectGroupItems);
    currentSystems$$ = this.store.selectSignal(selectCurrentSystems);

    icons = icons;
    constructor(
        private store: Store,
        private router: Router,
        private route: ActivatedRoute,
        private cpService: NxChannelPartnersService,
    ) {}

    ngOnInit(): void {
        if (!this.openGroups) {
            const openOrg: { [key: string]: boolean } = {};
            openOrg[this.rootOrg.id] = true;
            const groupsMap = new Map<string, GroupItem>(
                this.groupItems$$().map(group => [group.id, group]),
            );
            const currentGroup = this.currentGroup$$();
            if (currentGroup) {
                openOrg[currentGroup.id] = true;
                let { parentId } = currentGroup;
                while (parentId) {
                    openOrg[parentId] = true;
                    parentId = groupsMap.get(parentId)?.parentId;
                }
            }
            this.store.dispatch(GroupActions.setOpenGroups({ openGroups: openOrg }));
        }
    }

    trackItem(_index: number, item: GroupItem): string {
        return item.id;
    }

    onDrop(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
        if (!event.isPointerOverContainer || event.previousContainer === event.container) {
            return;
        }
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        if (dragged.type === OrgCardItem.GROUP) {
            this.cpService
                .patchGroup(dragged.id, { parentId: droppedOn.id })
                .subscribe(updatedGroup => {
                    // Use ngrx effect to update store
                    const groups: GroupItem[] = [...this.groupItems$$()];
                    const parentId = dragged.parentId;
                    if (parentId) {
                        const parentIndex = groups?.findIndex(group => group.id === parentId);
                        const parent = structuredClone(groups[parentIndex]);
                        parent.children = parent.children.filter(child => child.id !== dragged.id);
                        groups[parentIndex] = parent;
                    }
                    const droppedOnGroup = structuredClone(droppedOn);
                    if (droppedOnGroup.children) {
                        droppedOnGroup.children.push(updatedGroup);
                    } else {
                        droppedOnGroup.children = [updatedGroup];
                    }
                    droppedOnGroup.systemCount += 1;
                    const droppedOnIndex = groups?.findIndex(group => group.id === droppedOn.id);
                    groups[droppedOnIndex] = droppedOnGroup;

                    const movedGroupIndex = groups.findIndex(group => group.id === dragged.id);
                    groups[movedGroupIndex] = updatedGroup;
                    this.store.dispatch(GroupActions.setGroups({ groups }));
                });
        } else if (dragged.type === OrgCardItem.SYSTEM) {
            this.cpService
                .updateSystemGroup(dragged.systemId, { groupId: droppedOn.id })
                .subscribe(sys => {
                    const systems = this.currentSystems$$().filter(
                        sys => sys.systemId !== dragged.systemId,
                    );
                    const groups = structuredClone(this.groupItems$$());
                    const parentIndex = groups.findIndex(
                        group => group.id === this.currentGroupId$$(),
                    );
                    const targetIndex = groups?.findIndex(group => group.id === sys.groupId);
                    if (parentIndex !== -1) {
                        groups[parentIndex].systemCount -= 1;
                    }
                    if (targetIndex !== -1) {
                        groups[targetIndex].systemCount += 1;
                    }
                    this.store.dispatch(GroupActions.setGroupsAndSystems({ groups, systems }));
                });
        }
    }

    moveToRoot(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
        if (!event.isPointerOverContainer || event.previousContainer === event.container) {
            return;
        }
        const dragged = event.item.data;
        if (dragged.type === OrgCardItem.SYSTEM) {
            this.cpService.patchSystem(dragged.systemId, { groupId: null }).subscribe(_ => {
                const currSystems = [...this.currentSystems$$()];
                const updatedSystems = currSystems.filter(sys => sys.systemId !== dragged.systemId);
                const groups = structuredClone(this.groupItems$$());
                const groupIndex = groups?.findIndex(group => group.id === this.currentGroupId$$());
                if (groups && groupIndex !== -1) {
                    groups[groupIndex].systemCount -= 1;
                    this.store.dispatch(GroupActions.setGroups({ groups }));
                }
                this.store.dispatch(GroupActions.setSystems({ systems: updatedSystems }));
            });
        } else {
            this.cpService.patchGroup(dragged.id, { parentId: null }).subscribe(_ => {
                const groups: GroupItem[] = [...this.groupItems$$()];
                const currGroup = groups.findIndex(group => group.id === dragged.id);
                const parentIndex = groups.findIndex(group => group.id === dragged.parentId);
                const updatedGroup = structuredClone(groups[currGroup]);
                updatedGroup.parentId = null;
                groups[parentIndex] = {
                    ...groups[parentIndex],
                    children: groups[parentIndex].children.filter(group => group.id !== dragged.id),
                };
                groups[currGroup] = updatedGroup;
                this.store.dispatch(GroupActions.setGroups({ groups }));
            });
        }
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
