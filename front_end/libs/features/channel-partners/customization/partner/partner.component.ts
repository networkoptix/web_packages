import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { environment } from '@environments/environment';
import staticLang from '@language/language_i18n_static.json';
// import { NxMenuService } from '@menu/menu.service';
// import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import { NxApplyService } from '@services/apply.service';
import {
    OrganizationInfo,
    PartnerInfo,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxMenuService } from '@src/app/menu/menu.service';

@UntilDestroy()
@Component({
    selector: 'nx-customization-partners',
    templateUrl: 'partner.component.html',
    styleUrls: ['partner.component.scss'],
})
export class NxCustomizationPartnerComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;

    public partner: PartnerInfo;
    public organizations: OrganizationInfo[];

    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    private pageApply: ViewContainerRef;

    constructor(
        private applyService: NxApplyService,
        private partnersService: NxPartnersService,
        private route: ActivatedRoute,
        // private dialogService: NxDialogsService,
        private menuService: NxMenuService,
    ) {
        // this.menuService.detail = 'channels';
    }

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.partnersService.organizationsSubject.subscribe(organizations => {
            this.organizations = organizations;
        });

        this.route.paramMap.pipe(untilDestroyed(this)).subscribe(paramMap => {
            const partnerId = paramMap.get('partnerId');
            this.partner = this.partnersService.getPartner(parseInt(partnerId));
            this.menuService.detail = partnerId;

            this.partnersService.getOrganizations(this.partner);
        });
    }

    ngOnDestroy(): void {
        this.applyService.resetFormWatchers();
    }
}
