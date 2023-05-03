import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { map, mergeMap } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-organization',
    templateUrl: 'organization.component.html',
    styleUrls: ['organization.component.scss'],
})
export class NxOrganizationComponent implements OnInit {
    private id$ = this.route.params.pipe(map<Params, number>(p => Number(p.id)));
    organization$ = this.id$.pipe(mergeMap(this.cpService.getOrganization));
    users$ = this.id$.pipe(mergeMap(this.cpService.getOrganizationUsers));

    constructor(
        private cpService: NxChannelPartnersService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
    ) {}

    ngOnInit(): void {}

    back(): void {
        this.router.navigate(['sandbox', 'channel-partners']);
    }

    up(parent: Id): void {
        this.router.navigate(['../../', parent], { relativeTo: this.route });
    }

    newOrgUser(orgId: Id): void {
        this.dialogs.addOrgUser(orgId).then(res => {
            if (res) {
                this.users$ = this.id$.pipe(mergeMap(this.cpService.getOrganizationUsers));
            }
        });
    }

    deleteOrgUser(orgId: Id, userId: Id): void {
        this.cpService.deleteOrganizationUser(orgId, userId).subscribe({
            next: () => {
                this.users$ = this.id$.pipe(mergeMap(this.cpService.getOrganizationUsers));
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, 'danger');
            },
        });
    }
}
