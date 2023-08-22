import { NgIf } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSystemsListComponent } from '@components/systems-list/list.component';
import { Account } from '@services/account.service/account';
import { NgChanges } from '@utils/ng-changes';

import { SystemsDisplayMode } from '../home.types';
import { selectCurrentSystemItems } from '../store/groups/groups.selectors';

@Component({
    selector: 'nx-groups-systems',
    templateUrl: 'systems.component.html',
    styleUrls: ['systems.component.scss'],
    standalone: true,
    imports: [NgIf, NxPreLoaderComponent, NxSystemsListComponent],
})
export class NxGroupsSystemsComponent implements OnChanges {
    @Input() displayMode: SystemsDisplayMode;
    store = inject(Store);
    showPersonal$$ = signal<boolean>(false);
    currentUser$$ = this.store.selectSignal<Account>(selectCurrentUser);
    systemsFromStore$$ = this.store.selectSignal(selectCurrentSystemItems);
    systems$$ = computed<string[]>(() => {
        const systems = this.systemsFromStore$$();
        const { email } = this.currentUser$$();
        const showPersonal = this.showPersonal$$();
        return systems
            .filter(system =>
                showPersonal
                    ? system.ownerAccountEmail === email
                    : system.ownerAccountEmail !== email,
            )
            .map(({ id }) => id);
    });

    ngOnChanges(changes: NgChanges<NxGroupsSystemsComponent>): void {
        this.showPersonal$$.set(this.displayMode === SystemsDisplayMode.Personal);
    }
}
