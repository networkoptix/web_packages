import { NgModule, inject } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';

import { nxConfig } from '@services/nx-config/config';

import { entityNameResolver } from './entity-name-resolver';
import { entityResolver } from './entity-resolver';
import { NxReportsComponent } from './reports.component';
import { NxServiceChangesComponent } from './service-changes/service-changes.component';
import { NxServiceUsageComponent } from './service-usage/service-usage.component';
import { NxServiceUsageDetailsComponent } from './service-usage-details/service-usage-details.component';

const routes: Routes = [
    {
        path: '',
        component: NxReportsComponent,
        resolve: { isLoading: entityResolver },
        children: [
            {
                path: ':entityType',
                children: [
                    {
                        path: ':entityId',
                        children: [
                            {
                                path: 'service-usage',
                                canActivate: [
                                    () =>
                                        nxConfig.featureFlags.channelPartnersAccessServiceUsage ||
                                        inject(Router).navigate(['/reports']),
                                ],
                                children: [
                                    {
                                        path: '',
                                        component: NxServiceUsageComponent,
                                        resolve: { entityName: entityNameResolver },
                                    },
                                    {
                                        path: ':serviceId',
                                        component: NxServiceUsageDetailsComponent,
                                        resolve: { entityName: entityNameResolver },
                                    },
                                ],
                            },
                            {
                                path: 'service-changes',
                                component: NxServiceChangesComponent,
                                resolve: { entityName: entityNameResolver },
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
export class NxReportsModule {}
