import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { HomeSystemListComponent } from '@pages/home/components/systems-list/systems-list.component';
import { Account } from '@services/account.service/account';
import { Organization } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { NgChanges } from '@utils/ng-changes';

import { SystemsDisplayMode } from '../home.types';
import { NxChannelPartnersService } from '../services/channel-partners.service';

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
    systemsFromSubject$$ = toSignal(this.systemsService.splitSystems);
    orgMap$$ = toSignal(
        this.cpService.getOrganizations(true).pipe(
            map(orgs => {
                const orgMap = new Map<string, Organization>();
                for (const org of orgs) {
                    orgMap.set(org.id, org);
                }
                return orgMap;
            }),
        ),
    );
    systems$$ = computed<string[]>(() => {
        const showPersonal = this.showPersonal$$();
        const systemsFromSubject = this.systemsFromSubject$$();
        let systems: NxSystemInfo[] = [];
        for (const [_, sys] of systemsFromSubject?.get(showPersonal ? 'personal' : 'shared') ||
            []) {
            systems.push(sys);
        }
        if (!showPersonal) {
            const orgMap = this.orgMap$$() || new Map<string, Organization>();
            systems = systems.filter(sys => !orgMap.get(sys?.organizationId || ''));
        }
        return systems?.map(sys => sys.id);
    });

    constructor(private cpService: NxChannelPartnersService) {}

    ngOnChanges(changes: NgChanges<NxSystemsComponent>): void {
        this.showPersonal$$.set(this.displayMode === SystemsDisplayMode.Personal);
    }
}
