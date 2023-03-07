import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import type { Account } from '@services/account.service/account';
import { icons } from '@src/app/variables/static-variables';

import { BaseItems, GroupsItem, SharedItems } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import { selectHasCurrentIndexes } from '../../store/groups.selectors';

@Component({
    selector: 'nx-groups-cards',
    templateUrl: 'groups-cards.component.html',
    styleUrls: ['groups-cards.component.scss'],
})
export class NxGroupsCardsComponent {
    @Input() account: Account;
    @Input() showPersonal: boolean;
    @Input() personalItems: BaseItems;
    @Input() sharedItems: SharedItems;
    @Input() currentSharedOwner: string | null;
    inRoot$ = this.store.select<boolean>(selectHasCurrentIndexes);

    LANG = staticLang;
    icons = icons;

    get emptyGroup(): boolean {
        return !this.personalItems.groups.length && !this.personalItems.systems.length && !Object.keys(this.sharedItems).length;
    }

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
