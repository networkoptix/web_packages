import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, Observable, take } from 'rxjs';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { Account } from '@services/account.service/account';

import { GroupsItem, LoadingState, SharedItems } from '../../groups.types';
import { NxSystemGroupsService } from '../../services/system-groups.service';
import * as GroupActions from '../../store/groups.actions';
import { selectCurrentSystemItems, selectLoadingState } from '../../store/groups.selectors';

@Component({
    selector: 'nx-groups-systems',
    templateUrl: 'systems.component.html',
    styleUrls: ['systems.component.scss'],
})
export class NxGroupsSystemsComponent implements OnInit, OnDestroy {
    systems$: Observable<SharedItems>;
    userEmail: string;
    showPersonal: boolean = this.route.snapshot.url[0]?.path !== 'shared';
    loadingState$ = this.store.select<LoadingState>(selectLoadingState);
    LoadingState = LoadingState;

    constructor(
        private route: ActivatedRoute,
        private store: Store,
        private groupsService: NxSystemGroupsService,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: undefined }));
        this.systems$ = this.store.select(selectCurrentSystemItems).pipe(
            map(systems => {
                const result: SharedItems = {};

                this.store
                    .select<Account>(selectCurrentUser)
                    .pipe(take(1))
                    .subscribe(({ email }) => {
                        if (!systems) {
                            return {};
                        }
                        systems = systems.filter(system =>
                            this.showPersonal
                                ? system.ownerAccountEmail === email
                                : system.ownerAccountEmail !== email,
                        );

                        for (const system of systems) {
                            if (!result[system.ownerAccountEmail]) {
                                result[system.ownerAccountEmail] = { groups: [], systems: [] };
                            }
                            result[system.ownerAccountEmail].systems.push(system);
                        }
                    });
                return result;
            }),
        );
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }

    trackItem(_index: number, item: GroupsItem): string {
        return item.id;
    }
}
