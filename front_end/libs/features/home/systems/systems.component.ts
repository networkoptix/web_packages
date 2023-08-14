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
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, map, Observable, Subject } from 'rxjs';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { Account } from '@services/account.service/account';
import { search } from '@variables/static-variables';

import { NxSystemCardComponent } from '../components/system-card/system-card.component';
import { GroupsItem, LoadingState, SharedItems } from '../home.types';
import * as GroupActions from '../store/groups/groups.actions';
import { selectCurrentSystemItems } from '../store/groups/groups.selectors';

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
        TranslateModule,
        NxSearchComponent,
        FormsModule,
    ],
})
export class NxGroupsSystemsComponent implements OnInit {
    systems$: Observable<SharedItems>;
    filteredSystems$: Observable<SharedItems>;
    userEmail: string;
    LoadingState = LoadingState;

    showPersonal: boolean = this.route.snapshot.url[0]?.path !== 'shared';
    currentUser = this.store.selectSignal<Account>(selectCurrentUser);
    loadingState$: Observable<Account[]>;
    destroyRef = inject(DestroyRef);
    search = { value: '' };
    searchChanged = new Subject<void>();

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

        this.searchChanged
            .pipe(debounceTime(search.debounceTime), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.searchSystems();
            });

        this.search.value = this.route.snapshot.queryParams.search;
        this.searchSystems();
    }

    trackItem(_index: number, item: GroupsItem): string {
        return item.id;
    }

    searchSystems(): void {
        // TODO:
        // 1. Change behavior for the systems to not use a double for loop
        // 2. Then wire the search to the systems
        // const search = this.search.value;
        // if (search) {
        //     this.filteredSystems$ = this.systems$.pipe(map(res =>
        //         res.value.systems.filter(sys => caseInsenstiveSearch(sys.name, search))));
        // } else {
        //     this.filteredSystems$ = this.systems$;
        // }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }
}
