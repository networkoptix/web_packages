import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxFileDropModule } from 'ngx-file-drop';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { MenuModule } from '@src/menu/menu.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxSystemAlertsComponent } from './alerts/alerts.component';
import { NxSystemAlertCardComponent } from './card/card.component';
import { NxHealthLayoutService } from './health-layout.service';
import { NxHealthComponent } from './health/health.component';
import { NxSystemMetricsComponent } from './metrics/metrics.component';
import {
    NxDynamicTablePanelComponent
} from './table-components/dynamic-table-panel/dynamic-table-panel.component';
import {
    NxDynamicTableComponent
} from './table-components/dynamic-table/dynamic-table.component';
import {
    NxImageSectionComponent
} from './table-components/image-section/image-section.component';
import {
    NxSingleEntityComponent
} from './table-components/single-entity/single-entity.component';
import { NxUpdateInfoComponent } from './update-info/update-info.component';
import { NxReportViewerComponent } from './viewer/viewer.component';

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
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
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
