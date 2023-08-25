import type { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { catchError, map, merge, mergeMap, of, Subject } from 'rxjs';

import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    Organization,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-organization',
    templateUrl: 'organization.component.html',
    styleUrls: ['organization.component.scss'],
})
export class NxOrganizationComponent implements OnInit {
    private id$ = this.route.params.pipe(map<Params, string>(p => p.id));
    private refresh$ = new Subject<void>();
    private update$ = merge(this.id$, this.refresh$.pipe(mergeMap(() => this.id$)));

    error: { code: number; msg: string };
    usersError: { code: number; msg: string };

    organization$ = this.update$.pipe(
        mergeMap(this.cpService.getOrganization),
        catchError((err: HttpErrorResponse) => {
            this.error = { code: err.status, msg: err.error.detail };
            return of(null);
        }),
    );
    users$ = this.update$.pipe(
        mergeMap(this.cpService.getOrganizationUsers),
        catchError((err: HttpErrorResponse) => {
            this.usersError = { code: err.status, msg: err.error.detail };
            return of([]);
        }),
    );

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

    up(parent: string): void {
        this.router.navigate(['../../', parent], { relativeTo: this.route });
    }

    updateOrganization(org: Organization): void {
        this.dialogs.updateOrganization(org).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Updated organization ${res.name}`);
            }
        });
    }

    changeOrganizationState(organization: Organization): void {
        const { state: currentState, id } = organization;
        this.dialogs
            .changeCpState({
                currentState,
                update: newState => this.cpService.updateOrganization(id, { state: newState }),
            })
            .then(res => {
                if (res) {
                    this.refresh$.next();
                    this.toastService.notify(
                        `Changed state for org ${organization.name} to ${res}`,
                    );
                }
            });
    }

    newOrgUser(orgId: string): void {
        this.dialogs.addOrgUser(orgId).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Added new org user ${res.email}`);
            }
        });
    }

    updateOrgUser(orgId: string, user: OrganizationUser): void {
        this.dialogs.editOrgUser({ orgId, user }).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Updated org user ${res.email}`);
            }
        });
    }

    deleteOrgUser(orgId: string, userEmail: string): void {
        this.cpService.deleteOrganizationUser(orgId, userEmail).subscribe({
            next: () => {
                this.refresh$.next();
                this.toastService.notify(`Deleted org user`);
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, ToastType.Danger);
            },
        });
    }
}
