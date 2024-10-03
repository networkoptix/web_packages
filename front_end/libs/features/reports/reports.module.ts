import { inject, NgModule } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';

import { nxConfig } from '@services/nx-config/config';

import { entityNameResolver } from './entity-name-resolver';
import { entityResolver } from './entity-resolver';
import { NxExpiringServiceDetailsComponent } from './expiring-service-details/expiring-service-details.component';
import { NxRegularServiceDetailsComponent } from './regular-service-details/regular-service-details.component';
import { NxReportsComponent } from './reports.component';
import { NxServiceChangesComponent } from './service-changes/service-changes.component';
import { NxServiceUsageComponent } from './service-usage/service-usage.component';

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
                                        path: 'regular-service-details',
                                        children: [
                                            {
                                                path: ':serviceId',
                                                component: NxRegularServiceDetailsComponent,
                                                resolve: { entityName: entityNameResolver },
                                            },
                                        ],
                                    },
                                    {
                                        path: 'expiring-service-details',
                                        children: [
                                            {
                                                path: ':serviceId',
                                                component: NxExpiringServiceDetailsComponent,
                                                resolve: { entityName: entityNameResolver },
                                            },
                                        ],
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
