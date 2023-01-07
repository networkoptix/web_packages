import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { FooterModule } from '@components/footer/footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { FeatureGuard } from '@guards/feature.guard';
import { TwofaGuard } from '@guards/twofaGuard';
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
        canActivate: [FeatureGuard, TwofaGuard],
        data: {
            flags: FeatureFlagStrings.channelPartners,
            override: FeatureFlagStrings.channelPartners
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
            }
        ]
    }
];

@NgModule({
    imports: [
        FormsModule,
        ComponentsCoreModule,
        RouterModule.forChild(cloudPartnersRoutes),
        AngularSvgIconModule.forRoot(),
        ContentBlockModule,
        ContentBlockSectionModule,
        PreLoaderModule,
        FooterModule,
        MenuModule,
        NxCustomizationModule,
        NxPartnerOrganizationsListModule,
    ],
    providers: [
    ],
    declarations: [
        NxChannelPartnersComponent,
    ],
    bootstrap: [
    ],
    exports: [
        NxChannelPartnersComponent
    ]
})
export class NxChannelPartnersModule {
}
