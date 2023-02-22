import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@app/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import {
    OrganizationInfo,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy()
@Component({
    selector: 'nx-partner-org-detail-component',
    templateUrl: 'org-detail.component.html',
    styleUrls: ['org-detail.component.scss'],
})

export class NxPartnerOrganizationDetailComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;

    organization: OrganizationInfo;
    params: Params;

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute,
        private partnersService: NxPartnersService,
    ) {}

    ngOnInit(): void {
        this.route.paramMap
            .pipe(untilDestroyed(this))
            .subscribe(paramMap => {
                const id = paramMap.get('id');
                this.organization = this.partnersService.getOrganization(parseInt(id));
            });
    }

    ngOnDestroy(): void {}
}
