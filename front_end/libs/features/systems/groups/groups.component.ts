import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import type { GroupItem, GroupsItem, SystemItem, Crumb } from './groups.types';
import { LoadingState } from './groups.types';
import { NxSystemGroupsService } from './services/system-groups.service';
import * as GroupActions from './store/groups.actions';
import {
    selectCrumbs,
    selectCurrentGroupId,
    selectCurrentGroupItems,
    selectCurrentSystemItems,
    selectLoadingState,
    selectRootGroupItems,
    selectRootSystemItems,
} from './store/groups.selectors';

@Component({
    selector: 'nx-groups',
    templateUrl: 'groups.component.html',
    styleUrls: ['groups.component.scss']
})
export class NxSystemGroupsComponent implements OnInit, OnDestroy {
    icons = icons;

    loadingState$ = this.store.select<LoadingState>(selectLoadingState);

    rootGroups$ = this.store.select<GroupItem[] | undefined>(
        selectRootGroupItems
    );
    rootSystems$ = this.store.select<SystemItem[] | undefined>(
        selectRootSystemItems
    );

    currentGroups$ = this.store.select<GroupItem[] | null>(
        selectCurrentGroupItems
    );
    currentSystems$ = this.store.select<SystemItem[] | null>(
        selectCurrentSystemItems
    );
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);

    crumbs$ = this.store.select<Crumb[] | null>(selectCrumbs);

    private groupId: string;
    public isSidebarShown: boolean = true;

    LoadingState = LoadingState;

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private dialogsService: NxDialogsService,
        private route: ActivatedRoute,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.groupId = params.groupId;
            this.store.dispatch(
                GroupActions.setCurrentGroupId({
                    currentGroupId: params.groupId
                })
            );
        });
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }

    public handleSidebarTogglingEarClick(): void {
        this.isSidebarShown = !this.isSidebarShown;
    }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        this.groupsService.onDrop(event.item.data, null);
    }

    newGroupDialog(): void {
        this.dialogsService.createSystemGroup(this.groupId);
    }

    setSidebarAll(state: boolean): void {
        this.groupsService.sidebarOpenSubject.next(state);
    }

    __crash(): void {
        // @ts-expect-error Deliberately crash the backend for testing
        this.groupsService.moveGroup(['foo'], ['bar']);
    }
}
