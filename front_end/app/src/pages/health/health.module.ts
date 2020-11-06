import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule, Routes }   from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }        from '@ngx-translate/core';
import { AngularSvgIconModule }   from 'angular-svg-icon';
import { NgxFileDropModule }      from 'ngx-file-drop';

import { MenuModule }             from '../../menu';
import { ComponentsModule }       from '../../components/components.module';
import { AuthGuard, SystemGuard } from '../../routeGuards';
import { PipesModule }            from '../../pipes/pipes.module';

import {
    NxHealthComponent, NxReportViewerComponent, NxSystemAlertsComponent,
    NxSystemMetricsComponent, NxDynamicTableComponent,
    NxDynamicTablePanelComponent, NxSingleEntityComponent,
    NxImageSectionComponent, NxSystemAlertCardComponent, NxUpdateInfoComponent
}                                  from './';
import { DirectivesModule }        from '../../directives/directives.module';
import { NxHealthLayoutService }   from './health-layout.service';

const appRoutes: Routes = [
    {
        path      : 'report-viewer',
        component : NxReportViewerComponent,
        children  : [
            {
                path      : '',
                component : NxSystemAlertsComponent,
                pathMatch : 'full'
            },
            {
                path: 'alerts', component: NxSystemAlertsComponent
            },
            {
                path: ':metric', component: NxSystemMetricsComponent
            }
        ]
    },
    {
        path        : '',
        component   : NxHealthComponent,
        canActivate : [AuthGuard, SystemGuard],
        children    : [
            {
                path      : '',
                component : NxSystemAlertsComponent,
                pathMatch : 'full'
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
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
        NgxFileDropModule,
        PipesModule,
        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers    : [NxHealthLayoutService],
    declarations : [
        NxHealthComponent,
        NxReportViewerComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
        NxDynamicTableComponent,
        NxDynamicTablePanelComponent,
        NxSingleEntityComponent,
        NxImageSectionComponent,
        NxSystemAlertCardComponent,
        NxUpdateInfoComponent
    ],
    bootstrap       : [],
    exports: [
        NxHealthComponent,
        NxReportViewerComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent,
    ]
})
export class NxHealthModule {
}
