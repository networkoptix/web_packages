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
import { NxSystemAlertsComponent } from './alerts/alerts.component';
import { NxSystemMetricsComponent } from './metrics/metrics.component';
import { NxDynamicTableComponent }      from './table-components/dynamic-table/dynamic-table.component';
import { NxDynamicTablePanelComponent } from './table-components/dynamic-table-panel/dynamic-table-panel.component';
import { NxSingleEntityComponent }      from './table-components/single-entity/single-entity.component';
import { AngularSvgIconModule }         from 'angular-svg-icon';
import { NxImageSectionComponent }      from './table-components/image-section/image-section.component';
import { NgxFileDropModule }            from 'ngx-file-drop';
import { FormsModule }                  from '@angular/forms';
import { NxSystemAlertCardComponent } from './card/card.component';


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
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        AngularSvgIconModule,
        NgxFileDropModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxHealthComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxDynamicTableComponent,
        NxDynamicTablePanelComponent,
        NxSingleEntityComponent,
        NxImageSectionComponent,
        NxSystemAlertCardComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxHealthComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxImageSectionComponent
    ],
    exports: [
        NxHealthComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
    ]
})
export class NxHealthModule {
}
