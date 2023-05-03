import type { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { map, mergeMap, withLatestFrom } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-channel-partner',
    templateUrl: 'channel-partner.component.html',
    styleUrls: ['channel-partner.component.scss'],
})
export class NxChannelPartnerComponent implements OnInit {
    private id$ = this.route.params.pipe(map<Params, number>(p => Number(p.id)));
    channelPartner$ = this.id$.pipe(mergeMap(this.cpService.getChannelPartner));
    subPartners$ = this.id$.pipe(mergeMap(this.cpService.getSubChannelPartners));
    organizations$ = this.id$.pipe(
        mergeMap(id => this.cpService.getPartnerOrganizations(id)),
        withLatestFrom(this.id$),
        map(([orgs, id]) => {
            return orgs.filter(org => org.channelPartner === id);
        }),
    );
    users$ = this.id$.pipe(mergeMap(this.cpService.getChannelPartnerUsers));

    busy = false;

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
        this.router.navigate(['../', parent], { relativeTo: this.route });
    }

    newChannelPartner(parentChannelPartner: Id): void {
        this.dialogs.createChannelPartner(parentChannelPartner).then(res => {
            if (res) {
                this.subPartners$ = this.id$.pipe(mergeMap(this.cpService.getSubChannelPartners));
            }
        });
    }

    deleteChannelPartner(channelPartner: Id): void {
        this.cpService.removeChannelPartner(channelPartner).subscribe({
            next: () => {
                this.subPartners$ = this.id$.pipe(mergeMap(this.cpService.getSubChannelPartners));
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, 'danger');
            },
        });
    }

    newPartnerUser(channelPartner: Id): void {
        this.dialogs.addPartnerUser(channelPartner).then(res => {
            if (res) {
                this.users$ = this.id$.pipe(mergeMap(this.cpService.getChannelPartnerUsers));
            }
        });
    }

    deletePartnerUser(channelPartner: Id, userId: Id): void {
        this.cpService.deleteChannelPartnerUser(channelPartner, userId).subscribe({
            next: () => {
                this.users$ = this.id$.pipe(mergeMap(this.cpService.getChannelPartnerUsers));
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, 'danger');
            },
        });
    }

    newOrganization(channelPartner: Id): void {
        this.dialogs.createOrganization(channelPartner).then(res => {
            if (res) {
                this.organizations$ = this.id$.pipe(
                    mergeMap(id => this.cpService.getPartnerOrganizations(id)),
                    withLatestFrom(this.id$),
                    map(([orgs, id]) => {
                        return orgs.filter(org => org.channelPartner === id);
                    }),
                );
            }
        });
    }

    deleteOrganization(orgId: Id): void {
        this.cpService.removeOrganization(orgId).subscribe({
            next: () => {
                this.organizations$ = this.id$.pipe(
                    mergeMap(id => this.cpService.getPartnerOrganizations(id)),
                    withLatestFrom(this.id$),
                    map(([orgs, id]) => {
                        return orgs.filter(org => org.channelPartner === id);
                    }),
                );
            },
            error: (err: HttpErrorResponse) => {
                const msg = `${err.status} ${err.error.detail}`;
                this.toastService.notify(msg, 'danger');
            },
        });
    }
}
