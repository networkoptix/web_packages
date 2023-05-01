import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, combineLatest } from 'rxjs';

import { NxSystemsService } from '@services/systems.service';

import { NxSystemGroupsService } from './services/system-groups.service';

@UntilDestroy()
@Component({
    selector: 'nx-home',
    templateUrl: 'home.component.html',
})
export class NxHomeComponent implements OnInit, OnDestroy {
    isLoading: boolean = true;

    constructor(
        private router: Router,
        private groupsService: NxSystemGroupsService,
        private systemsService: NxSystemsService,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        const systems$ = this.systemsService.systemsSubject;
        // Temporary until API hooked up
        const organizations$ = new BehaviorSubject(null);
        const channelPartners$ = new BehaviorSubject(null);
        let redirectPath = 'personal';

        combineLatest([channelPartners$, organizations$, systems$])
            .pipe(untilDestroyed(this))
            .subscribe(([channelPartners, organizations, systems]) => {
                if (systems.some(sys => sys.accessRole === 'owner')) {
                    redirectPath = 'shared';
                }
                if (organizations) {
                    // Does not work at the moment, groupID required
                    redirectPath = 'organizations/testId';
                }
                if (channelPartners) {
                    const CPid = 'testId';
                    redirectPath = `channelPartners/${CPid}`;
                }
                this.isLoading = false;
                this.router.navigateByUrl(`home/${redirectPath}`);
            });
        organizations$.next(true);
        channelPartners$.next(true);
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }
}
