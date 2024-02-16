import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { environment } from '@environments/environment';
import staticLang from '@language/language_i18n_static.json';
import { NxMenuService } from '@menu/menu.service';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import { NxApplyService } from '@services/apply.service';
import { BrandInfo } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@UntilDestroy()
@Component({
    selector: 'nx-customization-component',
    templateUrl: 'customization.component.html',
    styleUrls: ['customization.component.scss'],
})
export class NxCustomizationComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;

    public hasCustomizations: boolean;
    public currentCustomization: BrandInfo;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    private pageApply: ViewContainerRef;

    constructor(
        private route: ActivatedRoute,
        private applyService: NxApplyService,
        private menuService: NxMenuService,
        private partnersService: NxPartnersService,
    ) {
        this.menuService.selectedSection$$.set('partners');
    }

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.partnersService.customizationsSubject.subscribe(customizations => {
            this.hasCustomizations = !!customizations.length;
        });

        this.route.paramMap.subscribe(paramMap => {
            const customizationId = parseInt(paramMap.get('id'));
            if (customizationId) {
                this.currentCustomization = this.partnersService.getCustomization(customizationId);
                if (this.currentCustomization) {
                    this.partnersService.getUsers();
                    this.partnersService.getPartners();
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.applyService.resetFormWatchers();
    }
}
