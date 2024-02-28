import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { HomeSystemListComponent } from '@pages/home/components/systems-list/systems-list.component';
import { Account } from '@services/account.service/account';
import type { Organization } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { selectRootOrganizations } from '@store/channel-partners/channel-partners.selectors';
import { NgChanges } from '@utils/ng-changes';
import { isOrgSystem } from '@utils/nx';

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
    private rootOrgs$$ = this.store.selectSignal<Organization[]>(selectRootOrganizations);

    /** Systems which the user has direct access to:
     * 1. Systems owned by the user
     * 2. Systems which the user has been added to
     *    a. This includes systems owned by orgs that the user has NOT been added to
     *
     * Excludes systems owned by orgs which user has indirect access to as member of the org
     */
    directAccessSystems$$ = computed<NxSystemInfo[]>(() => {
        const showPersonal = this.showPersonal$$();
        const systems = this.systemsService.systems$$();
        const orgs = this.rootOrgs$$();

        if (showPersonal) {
            return systems.filter(sys => sys.isMine);
        } else {
            const orgIds = new Set<string>(orgs.map(org => org.id));
            return systems.filter(
                sys => !sys.isMine && !(isOrgSystem(sys) && orgIds.has(sys.organizationId)),
            );
        }
    });

    ngOnChanges(changes: NgChanges<NxSystemsComponent>): void {
        this.showPersonal$$.set(this.displayMode === SystemsDisplayMode.Personal);
    }
}
