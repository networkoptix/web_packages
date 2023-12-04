import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { FeatureGuardActivate } from '@guards/feature.guard';
import { TwofaGuard } from '@guards/twofaGuard';
import { MenuModule } from '@menu/menu.module';
import { NxCustomizationComponent } from '@pages/channel-partners/customization/customization.component';
import { NxCustomizationModule } from '@pages/channel-partners/customization/customization.module';
import { NxCustomizationPartnerComponent } from '@pages/channel-partners/customization/partner/partner.component';
import { NxPartnerOrganizationsListComponent } from '@pages/channel-partners/organization/list/org-list.component';
import { NxPartnerOrganizationsListModule } from '@pages/channel-partners/organization/list/org-list.module';
import { FeatureFlagStrings } from '@services/nx-config/base-config';

import { NxChannelPartnersComponent } from './partners.component';

export const cloudPartnersRoutes: Routes = [
    {
        path: '',
        component: NxChannelPartnersComponent,
        canActivate: [FeatureGuardActivate, TwofaGuard],
        data: {
            flag: FeatureFlagStrings.channelPartners,
        },
        children: [
            {
                path: '',
                title: '',
                component: NxCustomizationComponent,
            },
            {
                path: 'customizations/:id',
                title: '',
                component: NxCustomizationComponent,
            },
            {
                path: 'customizations/:id/channel/:partnerId',
                title: '',
                component: NxCustomizationPartnerComponent,
            },
            {
                path: 'partner/:id',
                title: '',
                component: NxPartnerOrganizationsListComponent,
            },
        ],
    },
];

@NgModule({
    imports: [
        FormsModule,
        RouterModule.forChild(cloudPartnersRoutes),
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxFooterComponent,
        MenuModule,
        NxCustomizationModule,
        NxPartnerOrganizationsListModule,
        NxPreLoaderComponent,
    ],
    providers: [],
    declarations: [NxChannelPartnersComponent],
    bootstrap: [],
    exports: [NxChannelPartnersComponent],
})
export class NxChannelPartnersModule {}
