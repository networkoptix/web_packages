import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { catchError, map, merge, mergeMap, of, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    GroupItem,
    Organization,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-organization',
    templateUrl: 'organization.component.html',
    styleUrls: ['organization.component.scss'],
})
export class NxOrganizationComponent {
    private id$ = this.route.params.pipe(map<Params, string>(p => p.orgId));
    private id$$ = toSignal(this.id$);
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
    organization$$ = toSignal(this.organization$);
    users$ = this.update$.pipe(
        mergeMap(this.cpService.getOrganizationUsers),
        catchError((err: HttpErrorResponse) => {
            this.usersError = { code: err.status, msg: err.error.detail };
            return of<OrganizationUser[]>([]);
        }),
    );
    users$$ = toSignal(this.users$);
    groups$ = this.update$.pipe(
        mergeMap(this.cpService.getOrgGroups),
        catchError((err: HttpErrorResponse) => {
            this.usersError = { code: err.status, msg: err.error.detail };
            return of<GroupItem[]>([]);
        }),
    );
    groups$$ = toSignal(this.groups$);
    flatGroups$ = this.groups$.pipe(
        map(groups => {
            const flatGroups: (Omit<GroupItem, 'children'> & { level: number })[] = [];
            function append(group: GroupItem, level: number): void {
                const { children, ...flatItem } = group;
                flatGroups.push({ ...flatItem, level });
                children.forEach(g => append(g, level + 1));
            }
            groups.forEach(g => append(g, 0));
            return flatGroups;
        }),
    );

    orgRoles$$ = toSignal(this.cpService.getOrganizationRoles());

    newGroupName: string;

    constructor(
        private cpService: NxChannelPartnersService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
    ) {}

    back(): void {
        this.router.navigate(['sandbox', 'channel-partners']);
    }

    up(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
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

    newOrgUser(): void {
        this.dialogs.addOrgUser(this.id$$()).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Added new org user ${res.email}`);
            }
        });
    }

    newOrgUserV2(): void {
        this.dialogs
            .addOrgUserV2({
                organization: this.organization$$(),
                roles: this.orgRoles$$(),
                users: this.users$$(),
                groups: this.groups$$(),
            })
            .then(res => {
                if (res) {
                    this.refresh$.next();
                    this.toastService.notify(`Added new org user ${res.email}`);
                }
            });
    }

    updateOrgUser(user: OrganizationUser): void {
        this.dialogs.editOrgUser({ orgId: this.id$$(), user }).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Updated org user ${res.email}`);
            }
        });
    }

    deleteOrgUser(userEmail: string): void {
        this.cpService.deleteOrganizationUser(this.id$$(), userEmail).subscribe({
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

    createGroup(parentId: string | null): void {
        const name = this.newGroupName || `${uuid().slice(0, 8)}`;
        this.cpService
            .createGroup({
                name,
                organizationId: this.id$$(),
                parentId,
            })
            .subscribe({
                next: () => {
                    this.refresh$.next();
                    this.toastService.notify(`Created new group ${name}`);
                },
                error: (err: HttpErrorResponse) => {
                    const msg = `${err.status} ${err.error.detail}`;
                    this.toastService.notify(msg, ToastType.Danger);
                },
            });
    }
}
