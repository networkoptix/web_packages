import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { channelPartnersResolver } from './channel-partners-resolver';
import { NxReportsComponent } from './reports.component';
import { NxServiceChangesComponent } from './service-changes/service-changes.component';
import { NxServiceUsageComponent } from './service-usage/service-usage.component';

const routes: Routes = [
    {
        path: '',
        component: NxReportsComponent,
        resolve: { isLoading: channelPartnersResolver },
        children: [
            {
                path: ':entityType',
                children: [
                    {
                        path: ':entityId',
                        children: [
                            {
                                path: 'service-usage',
                                component: NxServiceUsageComponent,
                            },
                            {
                                path: 'service-changes',
                                component: NxServiceChangesComponent,
                            },
                            {
                                path: '**',
                                redirectTo: '',
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

@NgModule({
    imports: [NxReportsComponent, RouterModule.forChild(routes)],
    exports: [NxReportsComponent],
})
export class NxOrgReportsModule {}
