import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, booleanAttribute } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { Account } from '@services/account.service/account';
import { icons } from '@variables/static-variables';

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
    selector: 'nx-groups-cards',
    templateUrl: 'groups-cards.component.html',
    styleUrls: ['groups-cards.component.scss'],
})
export class NxGroupsCardsComponent {
    LANG = staticLang;
    icons = icons;

    @Input({ transform: booleanAttribute }) inRoot: boolean;
    hasGroups$ = this.store.select<boolean>(selectHasGroups);
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);
    currentGroups$ = this.store.select<GroupItem[]>(selectCurrentGroupItems);
    currentSystems$ = this.store.select<SystemItem[]>(selectCurrentSystemItems);
    currentGroupId = this.store.selectSignal<string>(selectCurrentGroupId);
    hasGroups = this.store.selectSignal<boolean>(selectHasGroups);
    account$ = this.store.select<Account>(selectCurrentUser);
    isAdmin = true;

    constructor(
        private groupsService: NxSystemGroupsService,
        private store: Store,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
    ) {
        this.route.params.subscribe(({ groupId }) => {
            this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: groupId }));
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
            targetId: this.currentGroupId(),
            hasGroups: this.hasGroups(),
            parentGroup: null,
        });
    }
}
