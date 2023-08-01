import {
    AsyncPipe,
    KeyValuePipe,
    NgClass,
    NgFor,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
} from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, Observable } from 'rxjs';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { Account } from '@services/account.service/account';

import { NxSystemCardComponent } from '../components/system-card/system-card.component';
import { GroupsItem, LoadingState, SharedItems } from '../home.types';
import * as GroupActions from '../store/groups/groups.actions';
import { selectCurrentSystemItems, selectLoadingState } from '../store/groups/groups.selectors';

@Component({
    selector: 'nx-groups-systems',
    templateUrl: 'systems.component.html',
    styleUrls: ['systems.component.scss'],
    standalone: true,
    imports: [
        NxSystemCardComponent,
        NgFor,
        NgSwitch,
        NgIf,
        NgClass,
        KeyValuePipe,
        AsyncPipe,
        NgSwitchCase,
        NgSwitchDefault,
        NxPreLoaderComponent,
    ],
})
export class NxGroupsSystemsComponent implements OnInit {
    systems$: Observable<SharedItems>;
    userEmail: string;
    LoadingState = LoadingState;

    showPersonal: boolean = this.route.snapshot.url[0]?.path !== 'shared';
    currentUser = this.store.selectSignal<Account>(selectCurrentUser);
    loadingState$ = this.store.select<LoadingState>(selectLoadingState);

    constructor(private route: ActivatedRoute, private store: Store) {}

    ngOnInit(): void {
        this.store.dispatch(GroupActions.setCurrentGroupId({ currentGroupId: undefined }));
        this.systems$ = this.store.select(selectCurrentSystemItems).pipe(
            map(systems => {
                if (!systems) {
                    return {};
                }
                const result: SharedItems = {};
                const { email } = this.currentUser();
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
                return result;
            }),
        );
    }

    trackItem(_index: number, item: GroupsItem): string {
        return item.id;
    }
}
