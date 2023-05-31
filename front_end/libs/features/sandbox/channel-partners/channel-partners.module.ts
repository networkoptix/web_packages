import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { NxChannelPartnerComponent } from './channel-partner/channel-partner.component';
import { NxChannelPartnerModule } from './channel-partner/channel-partner.module';
import { NxChannelPartnersComponent } from './channel-partners.component';
import { NxOrganizationComponent } from './organization/organization.component';
import { NxOrganizationModule } from './organization/organization.module';

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: NxChannelPartnersComponent,
    },
    {
        path: ':id',
        component: NxChannelPartnerComponent,
    },
    {
        path: 'org/:id',
        component: NxOrganizationComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        RouterModule.forChild(appRoutes),
        // AngularSvgIconModule,
        // TranslateModule,

        NxChannelPartnerModule,
        NxOrganizationModule,
    ],
    declarations: [
        NxChannelPartnersComponent,
    ],
    providers: [],
    exports: [
        NxChannelPartnersComponent,
    ]
})
export class NxChannelPartnersModule {}
