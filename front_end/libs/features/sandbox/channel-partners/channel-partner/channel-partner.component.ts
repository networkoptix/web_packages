import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { map, mergeMap } from 'rxjs';

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
    organizations$ = this.id$.pipe(mergeMap(this.cpService.getPartnerOrganizations));
    users$ = this.id$.pipe(mergeMap(this.cpService.getChannelPartnerUsers));

    constructor(
        private cpService: NxChannelPartnersService,
        private route: ActivatedRoute,
        private router: Router,
    ) {}

    ngOnInit(): void {}

    back(): void {
        this.router.navigate(['sandbox', 'channel-partners']);
    }

    up(parent: Id): void {
        this.router.navigate(['../', parent], { relativeTo: this.route });
    }
}
