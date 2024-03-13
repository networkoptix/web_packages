import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { HomeSystemListComponent } from '@pages/home/components/systems-list/systems-list.component';
import { Account } from '@services/account.service/account';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { NgChanges } from '@utils/ng-changes';

import { SystemsDisplayMode } from '../home.types';

@Component({
    selector: 'nx-groups-systems',
    templateUrl: 'systems.component.html',
    styleUrls: ['systems.component.scss'],
    standalone: true,
    imports: [CommonModule, NxPreLoaderComponent, HomeSystemListComponent],
})
export class NxSystemsComponent implements OnChanges {
    @Input() displayMode: SystemsDisplayMode;
    store = inject(Store);
    systemsService = inject(NxSystemsService);
    showPersonal$$ = signal<boolean>(false);
    currentUser$$ = this.store.selectSignal<Account>(selectCurrentUser);

    /** Systems which the user has direct access to:
     * 1. Systems owned by the user
     * 2. Systems which the user has been added to
     *    a. This includes systems owned by orgs that the user has NOT been added to
     *
     * Excludes systems owned by orgs which user has indirect access to as member of the org
     */
    directAccessSystems$$ = computed<NxSystemInfo[]>(() => {
        const showPersonal = this.showPersonal$$();
        const systems = this.systemsService.directAccessSystems$$();
        const filterByIsMine = showPersonal
            ? (sys: NxSystemInfo) => sys.isMine
            : (sys: NxSystemInfo) => !sys.isMine;
        return systems.filter(filterByIsMine);
    });

    ngOnChanges(changes: NgChanges<NxSystemsComponent>): void {
        this.showPersonal$$.set(this.displayMode === SystemsDisplayMode.Personal);
    }
}
