import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxChannelPartnerComponent } from './channel-partner/channel-partner.component';
import { NxChannelPartnersComponent } from './channel-partners.component';
import { NxOrganizationComponent } from './organization/organization.component';
import { NxSystemGroupComponent } from './system-group/system-group.component';

export const appRoutes: Routes = [
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
    imports: [RouterModule.forChild(appRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxChannelPartnersModule {}
