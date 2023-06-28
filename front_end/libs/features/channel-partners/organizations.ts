import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { MenuModule } from '@app/menu/menu.module';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { SearchModule } from '@components/search/search.module';
import { AuthGuard } from '@guards/authGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { NxCustomizationModule } from '@pages/channel-partners/customization/customization.module';
import { NxPartnerOrganizationDetailComponent } from '@pages/channel-partners/organization/detail/org-detail.component';
import { NxPartnerOrganizationDetailModule } from '@pages/channel-partners/organization/detail/org-detail.module';
import { NxPartnerOrganizationsListComponent } from '@pages/channel-partners/organization/list/org-list.component';
import { NxPartnerOrganizationsListModule } from '@pages/channel-partners/organization/list/org-list.module';

export const cloudPartnersRoutes: Routes = [
    {
        path: '',
        component: NxPartnerOrganizationsListComponent,
        canActivate: [AuthGuard, TwofaGuard],
        // children: [
        //     {
        //         path: ':id',
        //         title: '',
        //         component: NxPartnerOrganizationsComponent,
        //         canDeactivate: [ApplyGuard]
        //     },
        // ]
    },
    {
        path: ':id',
        component: NxPartnerOrganizationDetailComponent,
        canActivate: [AuthGuard, TwofaGuard],
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
        NxPartnerOrganizationDetailModule,
        NxPreLoaderComponent,
        SearchModule,
    ],
    providers: [],
    declarations: [NxPartnerOrganizationsListComponent, NxPartnerOrganizationDetailComponent],
    bootstrap: [],
    exports: [NxPartnerOrganizationsListComponent, NxPartnerOrganizationDetailComponent],
})
export class NxPartnerOrganizationsModule {}
