import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSystemsListComponent } from '@components/systems-list/list.component';
import { Account } from '@services/account.service/account';
import { NxSystemsService } from '@services/systems.service';
import { NgChanges } from '@utils/ng-changes';

import { SystemsDisplayMode } from '../home.types';

@Component({
    selector: 'nx-groups-systems',
    templateUrl: 'systems.component.html',
    styleUrls: ['systems.component.scss'],
    standalone: true,
    imports: [CommonModule, NxPreLoaderComponent, NxSystemsListComponent],
})
export class NxSystemsComponent implements OnChanges {
    @Input() displayMode: SystemsDisplayMode;
    store = inject(Store);
    systemsService = inject(NxSystemsService);
    showPersonal$$ = signal<boolean>(false);
    currentUser$$ = this.store.selectSignal<Account>(selectCurrentUser);
    systemsFromSubject$$ = toSignal(this.systemsService.systemsSubject);
    systems$$ = computed<string[]>(() => {
        const systems = this.systemsFromSubject$$();
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

    ngOnChanges(changes: NgChanges<NxSystemsComponent>): void {
        this.showPersonal$$.set(this.displayMode === SystemsDisplayMode.Personal);
    }
}
