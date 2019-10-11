import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

import { AuthGuard } from '../../routeGuards/authGuard';

import { NxHealthComponent } from './health.component';
import { NxSystemAlertsModule } from './alerts/alerts.module';
import { NxSystemAlertsComponent } from './alerts/alerts.component';
import { NxSystemMetricssModule } from './metrics/metrics.module';
import { NxSystemMetricsComponent } from './metrics/metrics.component';


const appRoutes: Routes = [
    {
        path    : 'systems/:systemId/health', component: NxHealthComponent, canActivate: [AuthGuard],
        children : [
            {
                path: '', redirectTo: 'alerts',
                pathMatch: 'full'
            },
            {
                path: 'alerts', component: NxSystemAlertsComponent
            },
            {
                path: ':metric', component: NxSystemMetricsComponent
            }
        ]
    }
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        NxSystemAlertsModule,
        NxSystemMetricssModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxHealthComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxHealthComponent
    ],
    exports: [
        NxHealthComponent
    ]
})
export class NxHealthModule {
}
