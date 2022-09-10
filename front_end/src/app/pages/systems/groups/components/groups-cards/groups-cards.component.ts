import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';

import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

import { GroupItem, GroupsItem, SystemItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

@Component({
    selector: 'nx-groups-cards',
    templateUrl: 'groups-cards.component.html',
    styleUrls: ['groups-cards.component.scss']
})
export class NxGroupsCardsComponent implements OnInit {
    @Input() groups: GroupItem[];
    @Input() systems: SystemItem[];

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    account: Account;

    get emptyGroup(): boolean {
        return !this.groups.length && !this.systems.length;
    }

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private accountService: NxAccountService,
        private groupsService: NxSystemGroupsService,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.config;
    }

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
        if (!event.isPointerOverContainer) {
            return;
        }

        if (dragged.type === 'group') {
            this.groupsService.moveGroup(dragged.id, droppedOn.id);
        } else if (dragged.type === 'system') {
            this.groupsService.moveSystem(dragged.id, droppedOn.id);
        }
    }
}
