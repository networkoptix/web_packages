import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';

import {
    GroupItem,
    GroupsItem,
    Crumb,
    SharedItems,
    BaseItems,
    OpenGroups,
    LoadingState,
    GroupPath,
} from './groups.types';
import { NxSystemGroupsService } from './services/system-groups.service';
import * as GroupActions from './store/groups.actions';
import {
    selectCrumbs,
    selectCurrentGroupId,
    selectCurrentGroupOwner,
    selectCurrentPath,
    selectCurrentSharedOwner,
    selectLoadingState,
    selectOpenGroups,
    selectPersonalItems,
    selectRootGroupItems,
    selectSharedItems,
} from './store/groups.selectors';

interface sidebarSettings {
    showSidebarState: boolean;
}

@Component({
    selector: 'nx-groups',
    templateUrl: 'groups.component.html',
    styleUrls: ['groups.component.scss'],
})
export class NxSystemGroupsComponent implements OnInit, OnDestroy {
    icons = icons;
    LoadingState = LoadingState;
    LANG = staticLang;
    openGroups$ = this.store.select<OpenGroups>(selectOpenGroups);
    crumbs$ = this.store.select<Crumb[] | null>(selectCrumbs);
    currentPath$ = this.store.select<GroupPath[]>(selectCurrentPath);
    userEmail: string = this.localStorageService.retrieve('loginstate');
    sidebarSettings: CustomAccountProperty<sidebarSettings>;
    showPersonal: boolean = true;
    sharedItems$ = this.store.select<SharedItems>(selectSharedItems);
    personalItems$ = this.store.select<BaseItems>(selectPersonalItems);
    allGroups$ = this.store.select(selectRootGroupItems);
    currentSharedOwner$ = this.store.select<string>(selectCurrentSharedOwner);
    currentGroupOwner$ = this.store.select<string>(selectCurrentGroupOwner);

    loadingState$ = this.store.select<LoadingState>(selectLoadingState);
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);
    rootGroups$ = this.store.select<GroupItem[] | undefined>(
        selectRootGroupItems
    );
    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private route: ActivatedRoute,
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
        private router: Router,
    ) {
        this.groupsService.connect();
        this.init();
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.store.dispatch(
                GroupActions.setCurrentGroupId({
                    currentGroupId: params.groupId
                })
            );
        });
        this.store.dispatch(GroupActions.setAccountEmail({ accountEmail: this.userEmail }));
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }

    init(): void {
        this.sidebarSettings = this.cloudApi.customAccountPropertyFactory('showSidebarState', this.userEmail, { showSidebarState: true });
    }

    public handleSidebarTogglingEarClick(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    public setSharedFilter(newState: boolean): void {
        if (newState === this.showPersonal) {
            return;
        }
        if (!newState) {
            this.store.dispatch(GroupActions.setCurrentSharedOwner({ currentSharedOwner: null }));
        }
        this.router.navigate(['/', 'groups']);
        this.showPersonal = newState;
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
