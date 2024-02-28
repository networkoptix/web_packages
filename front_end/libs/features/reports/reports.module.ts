import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxReportsComponent } from './reports.component';
import { NxServiceChangesComponent } from './service-changes/service-changes.component';
import { NxServiceUsageComponent } from './service-usage/service-usage.component';

const routes: Routes = [
    {
        path: '',
        component: NxReportsComponent,
        children: [
            {
                path: '',
                redirectTo: 'service-usage',
                pathMatch: 'full',
            },
            {
                path: 'service-usage',
                component: NxServiceUsageComponent,
            },
            {
                path: 'service-changes',
                component: NxServiceChangesComponent,
            },
        ],
    },
];

@NgModule({
    imports: [NxReportsComponent, RouterModule.forChild(routes)],
    exports: [NxReportsComponent],
})
export class NxOrgReportsModule {}
