import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';

import { GroupItem, GroupsItem, SystemItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

@Component({
    selector: 'nx-groups-cards',
    templateUrl: 'groups-cards.component.html',
    styleUrls: ['groups-cards.component.scss'],
    encapsulation: ViewEncapsulation.None,
    // Need to escape encapsulation to style cdk elements
})
export class NxGroupsCardsComponent implements OnInit {
    @Input() groups: GroupItem[];
    @Input() systems: SystemItem[];

    LANG = staticLang;

    account: Account;

    get emptyGroup(): boolean {
        return !this.groups.length && !this.systems.length;
    }

    constructor(
        private accountService: NxAccountService,
        private groupsService: NxSystemGroupsService,
    ) {}

    ngOnInit(): void {
        this.accountService.get().then(account => {
            if (account?.email) {
                this.account = account;
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
}
