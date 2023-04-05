import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import { icons } from '@lib/variables/static-variables';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';

import { GroupsItem, Crumb, OpenGroups, LoadingState, GroupPath } from '../home.types';
import { NxSystemGroupsService } from '../services/system-groups.service';
import * as GroupActions from '../store/groups.actions';
import {
    selectCurrentGroupId,
    selectCurrentGroupOwner,
    selectCurrentPath,
    selectCurrentRootGroup,
    selectHasCurrentIndexes,
    selectHasGroups,
    selectLoadingState,
    selectOpenGroups,
} from '../store/groups.selectors';

interface SidebarSettings {
    showSidebarState: boolean;
}

@Component({
    selector: 'nx-organization',
    templateUrl: 'organization.component.html',
    styleUrls: ['organization.component.scss'],
})
export class NxOrganizationsComponent implements OnInit, OnDestroy {
    icons = icons;
    LoadingState = LoadingState;
    LANG = staticLang;
    openGroups$ = this.store.select<OpenGroups>(selectOpenGroups);
    currentPath$ = this.store.select<GroupPath[]>(selectCurrentPath);
    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    userEmail: string;
    hasGroups$ = this.store.select<boolean>(selectHasGroups);
    currentGroupOwner$ = this.store.select<string>(selectCurrentGroupOwner);
    loadingState$ = this.store.select<LoadingState>(selectLoadingState);
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);
    inRoot$ = this.store.select<boolean>(selectHasCurrentIndexes);

    currentGroupId: string;
    currentTab: string;
    rootGroup$ = this.store.select<Crumb>(selectCurrentRootGroup);
    tabs = ['systems', 'users', 'reports', 'settings'];

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private route: ActivatedRoute,
        private router: Router,
        private cloudApi: NxCloudApiService,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        this.route.params.subscribe(({ id }) => {
            this.store.dispatch(
                GroupActions.setCurrentGroupId({
                    currentGroupId: id,
                }),
            );
        });

        this.route.url.subscribe(_ => {
            this.currentTab = this.route.firstChild.snapshot.url[0].path;
        });
        this.store
            .select<Account>(selectCurrentUser)
            .pipe(take(1))
            .subscribe(({ email }) => {
                this.userEmail = email;
                this.store.dispatch(GroupActions.setAccountEmail({ accountEmail: email }));
                this.sidebarSettings = this.cloudApi.customAccountPropertyFactory(
                    'showSidebarState',
                    email,
                    { showSidebarState: true },
                );
            });
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
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

    onTabClick(tab: string): void {
        this.store
            .select<string>(selectCurrentGroupId)
            .pipe(take(1))
            .subscribe(id => this.router.navigate(['home', 'organization', id, tab]));
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
