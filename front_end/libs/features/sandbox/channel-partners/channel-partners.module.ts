import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
// import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { LetDirective, PushPipe } from '@ngrx/component';

import { NxChannelPartnerComponent } from './channel-partner/channel-partner.component';
import { NxChannelPartnerModule } from './channel-partner/channel-partner.module';
import { NxChannelPartnersComponent } from './channel-partners.component';
import { NxOrganizationComponent } from './organization/organization.component';
import { NxOrganizationModule } from './organization/organization.module';
import { NxSystemGroupComponent } from './system-group/system-group.component';

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: NxChannelPartnersComponent,
    },
    {
        path: ':partnerId',
        component: NxChannelPartnerComponent,
    },
    {
        path: ':partnerId/:orgId',
        component: NxOrganizationComponent,
    },
    {
        path: ':partnerId/:orgId/:groupId',
        component: NxSystemGroupComponent,
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
        LetDirective,
        PushPipe,
    ],
    declarations: [NxChannelPartnersComponent],
    providers: [],
    exports: [NxChannelPartnersComponent],
})
export class NxChannelPartnersModule {}
