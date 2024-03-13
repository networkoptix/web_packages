import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, computed, inject, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import {
    GroupItem,
    OrgPermissions,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { selectCurrentOrganization } from '@store/channel-partners/channel-partners.selectors';

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
    @Input() groupId: string;

    groupsStore = inject(GroupsStore);
    currentGroupId$$ = computed(() => this.groupsStore.currentGroupId$$()?.id);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    canManageSystems$$ = computed(() =>
        this.currentOrg$$()?.ownPermissions?.includes(OrgPermissions.MANAGE_SYSTEMS),
    );

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
        if (!event.isPointerOverContainer || event.previousContainer === event.container) {
            return;
        }
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        this.groupsStore.moveItem(dragged, droppedOn).subscribe();
    }

    moveToRoot(event: CdkDragDrop<GroupItem, GroupItem, GroupItem>): void {
        if (!event.isPointerOverContainer || event.previousContainer === event.container) {
            return;
        }
        const dragged = event.item.data;
        this.groupsStore.moveItem(dragged).subscribe();
    }

    toGroup(groupId: string): void {
        this.router.navigate(['group', groupId], { relativeTo: this.route });
    }

    toRoot(): void {
        this.router.navigate(['./'], { relativeTo: this.route });
    }
}
