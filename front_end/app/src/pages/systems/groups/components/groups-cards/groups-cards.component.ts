import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxAccountService } from '@services/account.service';
import type { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystemWithUserInfo } from '@services/system.service/system-types';
import { NgChanges } from '@utils/ng-changes';

import { GroupItem, GroupsItem, SystemItem } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';

function findTargetAddress(
    targetId: string,
    currentLevel: GroupItem[],
    addressBase: number[] = [],
    targetAddress: number[] = null,
): number[] {
    for (let i = 0; i < currentLevel.length; i++) {
        if (targetAddress) {
            return targetAddress;
        }

        const currentGroup = currentLevel[i];
        const currentAddress = [...addressBase, i];
        if (currentGroup.id === targetId) {
            return [...currentAddress];
        }

        targetAddress = findTargetAddress(
            targetId,
            currentGroup.groups,
            currentAddress,
            targetAddress,
        );
    }
    return targetAddress;
}

@Component({
    selector: 'nx-groups-cards',
    templateUrl: 'groups-cards.component.html',
    styleUrls: ['groups-cards.component.scss']
})
export class NxGroupsCardsComponent implements OnInit, OnChanges {
    @Input() rootGroups: GroupItem[];
    @Input() rootSystems: SystemItem[];

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    account: Account;

    currentGroupId: string;
    /** The "address" of the currently selected group */
    currentIndexes: number[] = [];

    show404: boolean = false;

    get groups(): GroupItem[] {
        return this.currentIndexes.length
            ? this.currentIndexes.reduce(
                (groups, index) => groups[index].groups,
                this.rootGroups
            )
            : this.rootGroups;
    }

    get systems(): SystemItem[] {
        if (this.currentIndexes.length) {
            const currentGroup = this.currentIndexes.reduce(
                (group, index) => group.groups[index],
                { groups: this.rootGroups, systems: this.rootSystems }
            );
            return currentGroup.systems;
        } else {
            return this.rootSystems;
        }
    }

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private accountService: NxAccountService,
        private route: ActivatedRoute,
        private router: Router,
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

        this.route.params.subscribe(params => {
            this.show404 = false;
            const { groupId } = params;
            this.currentGroupId = groupId;

            if (!groupId) {
                this.currentIndexes = [];
                return;
            }

            this.navigateToGroup(groupId);
        });
    }

    ngOnChanges({ rootGroups }: NgChanges<NxGroupsCardsComponent>): void {
        if (
            (
                !rootGroups.previousValue ||
                rootGroups.previousValue.length === 0
            ) &&
            rootGroups.currentValue?.length &&
            this.currentGroupId
        ) {
            this.navigateToGroup(this.currentGroupId, rootGroups.currentValue);
        }
        // "Secondary" initial load for when navigating directly to
        // group url since websocket data returns slower than
        // route param subscription
        // TODO: Try moving this to ngrx as a selector
    }

    navigateToGroup(
        groupId: string,
        rootGroups: GroupItem[] = this.rootGroups
    ): void {
        const targetAddress = findTargetAddress(groupId, rootGroups);
        console.log(targetAddress);

        if (targetAddress) {
            this.currentIndexes = targetAddress;
        } else {
            this.show404 = true;
        }
    }

    trackItem(_index: number, item: GroupsItem): string | undefined {
        return item ? item.id : undefined;
    }

    openSystem = (system: NxSystemWithUserInfo): void => {
        this.router.navigate(['systems', system.id]);
    };

    onDrop(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        const dragged = event.item.data;
        const droppedOn = event.container.data;
        if (
            !event.isPointerOverContainer ||
            dragged.id === droppedOn.id ||
            droppedOn.type === 'system'
        ) {
            return;
        }

        if (dragged.type === 'group') {
            this.groupsService.moveGroup(dragged.id, droppedOn.id);
        } else if (dragged.type === 'system') {
            this.groupsService.moveSystem(dragged.id, droppedOn.id);
        }
    }
}
