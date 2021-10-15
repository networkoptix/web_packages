import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule, Routes }   from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }        from '@ngx-translate/core';
import { AngularSvgIconModule }   from 'angular-svg-icon';
import { NgxFileDropModule }      from 'ngx-file-drop';

import { MenuModule }             from '@src/menu';
import { ComponentsModule }       from '@components/components.module';
import { AuthGuard, SystemGuard } from '@src/routeGuards';
import { PipesModule }            from '@src/pipes/pipes.module';

import {
    NxHealthComponent, NxReportViewerComponent, NxSystemAlertsComponent,
    NxSystemMetricsComponent, NxDynamicTableComponent,
    NxDynamicTablePanelComponent, NxSingleEntityComponent,
    NxImageSectionComponent, NxSystemAlertCardComponent, NxUpdateInfoComponent
}                                  from './';
import { DirectivesModule }        from '@directives/directives.module';
import { NxHealthLayoutService }   from './health-layout.service';

const appRoutes: Routes = [
    {
        path: 'viewer',
        component: NxReportViewerComponent,
        children: [
            {
                path: '',
                component: NxSystemAlertsComponent,
                pathMatch: 'full'
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
        path: '',
        component: NxHealthComponent,
        canActivate: [AuthGuard, SystemGuard],
        children: [
            {
                path: '',
                component: NxSystemAlertsComponent,
                pathMatch: 'full'
            },
            {
                path: 'alerts', component: NxSystemAlertsComponent
            },
            {
                path: ':metric', component: NxSystemMetricsComponent
            }
        ]
        // FIXME: runGuardsAndResolvers : 'always' breaks /health/
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
        PipesModule,
        AngularSvgIconModule.forRoot(),
        NgxFileDropModule,
        PipesModule,
        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers: [NxHealthLayoutService],
    declarations: [
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
    bootstrap: [],
    exports: [
        NxHealthComponent,
        NxReportViewerComponent,
        NxSystemAlertsComponent,
        NxSystemMetricsComponent
    ]
})
export class NxHealthModule {
}
