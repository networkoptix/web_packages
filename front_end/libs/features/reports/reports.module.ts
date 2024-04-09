import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { channelPartnersResolver } from './channel-partners-resolver';
import { entityNameResolver } from './entity-name-resolver';
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
                                resolve: { entityName: entityNameResolver },
                            },
                            {
                                path: 'service-changes',
                                component: NxServiceChangesComponent,
                                resolve: { entityName: entityNameResolver },
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
