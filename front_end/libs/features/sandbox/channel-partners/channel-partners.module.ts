import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxChannelPartnerComponent } from './channel-partner/channel-partner.component';
import { NxChannelPartnersComponent } from './channel-partners.component';
import { NxCpOfflineDataComponent } from './offline-data/offline-data.component';
import { NxOrganizationComponent } from './organization/organization.component';
import { NxSystemGroupComponent } from './system-group/system-group.component';

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: NxChannelPartnersComponent,
    },
    {
        path: 'offline',
        pathMatch: 'full',
        component: NxCpOfflineDataComponent,
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
