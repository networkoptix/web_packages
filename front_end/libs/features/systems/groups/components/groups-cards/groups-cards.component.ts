import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import type { Account } from '@services/account.service/account';
import { icons } from '@src/app/variables/static-variables';

import { GroupItem, GroupsItem, SystemItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import { selectCurrentGroupItems, selectCurrentSystemItems, selectHasCurrentIndexes } from '../../store/groups.selectors';

@Component({
    selector: 'nx-groups-cards',
    templateUrl: 'groups-cards.component.html',
    styleUrls: ['groups-cards.component.scss'],
})
export class NxGroupsCardsComponent {
    inRoot$ = this.store.select<boolean>(selectHasCurrentIndexes);
    currentGroups$ = this.store.select<GroupItem[]>(selectCurrentGroupItems);
    currentSystems$ = this.store.select<SystemItem[]>(selectCurrentSystemItems);
    account$ = this.store.select<Account>(selectCurrentUser);

    LANG = staticLang;
    icons = icons;

    constructor(
        private groupsService: NxSystemGroupsService,
        private store: Store,
    ) {
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
}
