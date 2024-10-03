import { type CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, computed, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DeviceDetectorService } from 'ngx-device-detector';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import type { DraggableItem } from '@pages/home/home.types';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { PipesModule } from '@pipes/pipes.module';
import { GroupItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
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
        RouterModule,
        PipesModule,
    ],
})
export class NxGroupsSidebarLevelComponent {
    @Input() groups: GroupItem[];
    @Input() groupId: string;

    groupsStore = inject(GroupsStore);
    permissionsStore = inject(PermissionsStore);

    channelPartnersRouteStore = inject(ChannelPartnersRouteState);
    currentGroupId$$ = computed(() => this.groupsStore.currentGroupId$$()?.id);
    isRoot$$ = computed(() => this.groupsStore.currentGroupId$$()?.isRoot);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    canManageSystems$$ = this.permissionsStore.canManageSystems$$;

    icons = icons;
    isMobile = false;
    constructor(
        private store: Store,
        deviceService: DeviceDetectorService,
    ) {
        this.isMobile = deviceService.isMobile() || deviceService.isTablet();
    }

    trackItem(_index: number, item: GroupItem): string {
        return item.id;
    }

    onDrop(event: CdkDragDrop<GroupItem, DraggableItem, DraggableItem>): void {
        if (!event.isPointerOverContainer || event.previousContainer === event.container) {
            return;
        }
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        this.groupsStore.moveItem(dragged, droppedOn).subscribe();
    }

    moveToRoot(event: CdkDragDrop<undefined, DraggableItem, DraggableItem>): void {
        if (!event.isPointerOverContainer) {
            return;
        }
        const dragged = event.item.data;
        this.groupsStore.moveItem(dragged).subscribe();
    }
}
