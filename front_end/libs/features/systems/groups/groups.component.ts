import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { LocalStorageService } from 'ngx-webstorage';
import { forkJoin, take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';

import {
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
    selectHasGroups,
    selectLoadingState,
    selectOpenGroups,
    selectPersonalItems,
    selectSharedItems,
} from './store/groups.selectors';

interface SidebarSettings {
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
    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    showPersonal: boolean = true;
    sharedItems$ = this.store.select<SharedItems>(selectSharedItems);
    personalItems$ = this.store.select<BaseItems>(selectPersonalItems);
    hasGroups$ = this.store.select(selectHasGroups);
    currentSharedOwner$ = this.store.select<string>(selectCurrentSharedOwner);
    currentGroupOwner$ = this.store.select<string>(selectCurrentGroupOwner);
    loadingState$ = this.store.select<LoadingState>(selectLoadingState);
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private route: ActivatedRoute,
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
        private dialogsService: NxDialogsService,
    ) {
        this.groupsService.connect();
        this.init();
    }

    ngOnInit(): void {
        this.route.url.subscribe(url => {
            this.showPersonal = url[0].path !== 'shared';
        });

        this.route.params.subscribe(params => {
            if (params.groupId === 'shared') {
                return;
            }
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

    dismiss(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = false;
            return curr;
        }, true);
    }

    newGroupDialog(): void {
        const currentGroupId$ = this.currentGroupId$.pipe(take(1));
        const hasGroups$ = this.hasGroups$.pipe(take(1));
        forkJoin([currentGroupId$, hasGroups$])
            .subscribe(([currentGroupId, hasGroups]) => this.dialogsService.createSystemGroup({
                targetId: currentGroupId,
                hasGroups,
                parentGroup: null
            }));
    }

    // Temporary
    // addOrgUser(): void {
    //     this.dialogsService.addOrgUser();
    // }
    // editOrgUser(): void {
    //     this.dialogsService.editOrgUser();
    // }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        this.groupsService.onDrop(event.item.data, null);
    }

    __crash(): void {
        // @ts-expect-error Deliberately crash the backend for testing
        this.groupsService.moveGroup(['foo'], ['bar']);
    }
}
