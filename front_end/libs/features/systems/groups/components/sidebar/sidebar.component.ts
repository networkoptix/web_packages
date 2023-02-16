
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { icons } from '@src/app/variables/static-variables';

import { GroupsItem, GroupItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

interface sidebarSettings {
    showSidebarState: boolean;
}

@Component({
    selector: 'nx-groups-sidebar',
    templateUrl: 'sidebar.component.html',
    styleUrls: ['sidebar.component.scss'],
})
export class NxSystemGroupsSidebarComponent {
    @Input() currentGroupId: string;
    @Input() hasGroups: boolean;
    @Input() groups: GroupItem[];
    @Input() userEmail: string;

    showSidebar: CustomAccountProperty<sidebarSettings>;
    icons = icons;
    LANG = staticLang;

    constructor(
      private groupsService: NxSystemGroupsService,
      private cloudApi: NxCloudApiService,
      private dialogsService: NxDialogsService
    ) {
        this.showSidebar = this.cloudApi.customAccountPropertyFactory('showSidebarState', this.userEmail, { showSidebarState: true });
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        this.groupsService.onDrop(event.item.data, null);
    }

    handleSidebarTogglingEarClick(): void {
        this.showSidebar.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup(this.currentGroupId, null, this.hasGroups);
    }

    dismissIntroduction(): void {
        this.showSidebar.update(curr => {
            curr.showSidebarState = false;
            return curr;
        }, true);
    }
}
