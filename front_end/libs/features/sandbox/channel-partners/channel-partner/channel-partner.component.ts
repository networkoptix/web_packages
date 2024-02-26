import { CommonModule } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { LetDirective, PushPipe } from '@ngrx/component';
import { catchError, map, merge, mergeMap, of, Subject } from 'rxjs';

import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    ChannelPartnerUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-channel-partner',
    templateUrl: 'channel-partner.component.html',
    styleUrls: ['channel-partner.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, LetDirective, PushPipe],
})
export class NxChannelPartnerComponent implements OnInit {
    private id$ = this.route.params.pipe(map<Params, string>(p => p.partnerId));
    private refresh$ = new Subject<void>();
    private update$ = merge(this.id$, this.refresh$.pipe(mergeMap(() => this.id$)));

    error: { code: number; msg: string };

    channelPartner$ = this.update$.pipe(
        mergeMap(this.cpService.getChannelPartner),
        catchError((err: HttpErrorResponse) => {
            this.error = { code: err.status, msg: err.error.detail };
            return of(null);
        }),
    );
    subPartners$ = this.update$.pipe(mergeMap(this.cpService.getSubChannelPartners));
    organizations$ = this.update$.pipe(
        mergeMap(id =>
            this.cpService
                .getPartnerOrganizations(id)
                .pipe(map(orgs => orgs.filter(org => org.channelPartner === id))),
        ),
    );
    users$ = this.update$.pipe(mergeMap(this.cpService.getChannelPartnerUsers));

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
        this.router.navigate(['../', parent], { relativeTo: this.route });
    }

    newChannelPartner(parentChannelPartner: string): void {
        this.dialogs.createChannelPartner(parentChannelPartner).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Created new partner ${res.name}`);
            }
        });
    }

    updateChannelPartner(channelPartner: ChannelPartner): void {
        this.dialogs.updateChannelPartner(channelPartner).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Updated partner ${res.name}`);
            }
        });
    }

    changePartnerState(channelPartner: ChannelPartner): void {
        const { state: currentState, id } = channelPartner;
        this.dialogs
            .changeCpState({
                currentState,
                update: newState => this.cpService.updateChannelPartner(id, { state: newState }),
            })
            .then(res => {
                if (res) {
                    this.refresh$.next();
                    this.toastService.notify(
                        `Changed state for partner ${channelPartner.name} to ${res}`,
                    );
                }
            });
    }

    deleteChannelPartner(channelPartner: string): void {
        this.cpService.removeChannelPartner(channelPartner).subscribe({
            next: () => {
                this.refresh$.next();
                this.toastService.notify('Deleted partner');
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, ToastType.Danger);
            },
        });
    }

    newPartnerUser(channelPartner: string): void {
        this.dialogs.addPartnerUser(channelPartner).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Added new partner user ${res.email}`);
            }
        });
    }

    updatePartnerUser(channelPartner: string, user: ChannelPartnerUser): void {
        this.dialogs.updatePartnerUser({ channelPartner, user }).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Added new partner user ${res.email}`);
            }
        });
    }

    deletePartnerUser(channelPartner: string, userEmail: string): void {
        this.cpService.deleteChannelPartnerUser(channelPartner, userEmail).subscribe({
            next: () => {
                this.refresh$.next();
                this.toastService.notify(`Deleted partner user`);
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, ToastType.Danger);
            },
        });
    }

    newOrganization(channelPartner: string): void {
        this.dialogs.createOrganization(channelPartner).then(res => {
            if (res) {
                this.refresh$.next();
                this.toastService.notify(`Created organization ${res.name}`);
            }
        });
    }

    deleteOrganization(orgId: string): void {
        this.cpService.removeOrganization(orgId).subscribe({
            next: () => {
                this.refresh$.next();
                this.toastService.notify(`Deleted organization`);
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, ToastType.Danger);
            },
        });
    }
}
