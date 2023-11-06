import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import { selectCurrentOrgId } from '@pages/home/store/channel-partners/channel-partners.selectors';
import { icons } from '@variables/static-variables';

import { NxNoSystemsCardsComponent } from '../../components/no-systems/no-systems.component';
import { NxSystemCardComponent } from '../../components/system-card/system-card.component';
import { GroupItem, GroupsItem, SystemItem } from '../../home.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups/groups.actions';
import {
    selectCurrentGroupId,
    selectCurrentGroupItems,
    selectCurrentSystemItems,
    selectHasGroups,
} from '../../store/groups/groups.selectors';

@Component({
    selector: 'nx-org-cards-container',
    templateUrl: 'org-cards-container.component.html',
    styleUrls: ['org-cards-container.component.scss'],
    standalone: true,
    imports: [
        TranslateModule,
        CdkMenuModule,
        CommonModule,
        NxSystemCardComponent,
        DragDropModule,
        NxNoSystemsCardsComponent,
        NxCardComponent,
        AngularSvgIconModule,
        NxPreLoaderComponent,
    ],
})
export class NxOrganizationCardContainerComponent {
    LANG = staticLang;
    icons = icons;
    @Input({ transform: booleanAttribute }) inRoot: boolean;
    hasGroups$$ = this.store.selectSignal<boolean>(selectHasGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);
    currentGroups$$ = this.store.selectSignal<GroupItem[]>(selectCurrentGroupItems);
    currentSystems$$ = this.store.selectSignal<SystemItem[]>(selectCurrentSystemItems);
    isAdmin = true;
    isLoading = true;
    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
        private groupsService: NxSystemGroupsService,
        private router: Router,
    ) {
        this.route.params.subscribe(({ groupId }) => {
            this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: groupId }));
        });

        effect(() => {
            if (this.currentGroups$$() && this.currentSystems$$()) {
                this.isLoading = false;
            }
        });
    }

    trackItem(_index: number, item: GroupsItem): string {
        return item.id;
    }

    onDrop(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        if (!event.isPointerOverContainer || dragged.id === droppedOn.id) {
            return;
        }

        if (dragged.type === 'group') {
            this.groupsService.moveGroup(dragged.id, droppedOn.id);
        } else if (dragged.type === 'system') {
            this.groupsService.moveSystem(dragged.id, droppedOn.id);
        }
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup({
            targetId: this.currentGroupId$$(),
            orgId: this.currentOrgId$$(),
            hasGroups: this.hasGroups$$(),
            parentGroup: null,
        });
    }

    handleGroupClick(group: GroupItem): void {
        this.router.navigate(['group', group.id], { relativeTo: this.route.parent });
    }
}
