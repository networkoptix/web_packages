import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';

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

interface sidebarSettings {
    showSidebarState: boolean;
}

@Component({
    selector: 'nx-groups',
    templateUrl: 'groups.component.html',
    styleUrls: ['groups.component.scss']
})
export class NxSystemGroupsComponent implements OnInit, OnDestroy {
    icons = icons;
    LoadingState = LoadingState;
    LANG = staticLang;
    crumbs$ = this.store.select<Crumb[] | null>(selectCrumbs);
    userEmail: string = this.localStorageService.retrieve('loginstate');
    sidebarSettings: CustomAccountProperty<sidebarSettings>;

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

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private route: ActivatedRoute,
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
    ) {
        this.groupsService.connect();
        this.initSidebar();
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
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

    initSidebar(): void {
        this.sidebarSettings = this.cloudApi.customAccountPropertyFactory('showSidebarState', this.userEmail, { showSidebarState: true });
    }

    public handleSidebarTogglingEarClick(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        this.groupsService.onDrop(event.item.data, null);
    }

    setSidebarAll(state: boolean): void {
        this.groupsService.sidebarOpenSubject.next(state);
    }

    __crash(): void {
        // @ts-expect-error Deliberately crash the backend for testing
        this.groupsService.moveGroup(['foo'], ['bar']);
    }
}
