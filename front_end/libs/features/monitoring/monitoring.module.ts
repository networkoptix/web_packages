import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuModule } from '@app/menu/menu.module';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { NxLoggerComponent } from '@components/logger/logger.component';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';

import { GraphsComponent } from './graphs/graphs.component';
import { LogsComponent } from './logs/logs.component';
import { NxMonitoringComponent } from './monitoring.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'monitoring',
        component: NxMonitoringComponent,
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'graphs',
            },
            {
                path: 'logs',
                component: LogsComponent,
            },
            {
                path: 'graphs',
                component: GraphsComponent,
            },
        ],
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        NxAlertBlockComponent,
        NxLoggerComponent,
        MenuModule,
        NxMonitoringGraphComponent,
        NxGenericDropdownModule,
        PagePlaceHolderModule,
        PreLoaderModule,
    ],
    providers: [],
    declarations: [NxMonitoringComponent, GraphsComponent, LogsComponent],
    bootstrap: [],
    exports: [NxMonitoringComponent],
})
export class NxMonitoringModule {}
