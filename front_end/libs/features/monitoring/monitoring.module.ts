import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuModule } from '@app/menu/menu.module';
import { ComponentsModule } from '@components/components.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { MonitoringGraphModule } from '@components/graph/graph.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
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
                redirectTo: 'graphs'
            },
            {
                path: 'logs',
                component: LogsComponent,
            },
            {
                path: 'graphs',
                component: GraphsComponent,
            },
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
        MenuModule,
        PagePlaceHolderModule,
        MonitoringGraphModule,
        AlertBlockModule
    ],
    providers: [],
    declarations: [
        NxMonitoringComponent,
        GraphsComponent,
        LogsComponent,
    ],
    bootstrap: [],
    exports: [
        NxMonitoringComponent
    ]
})
export class NxMonitoringModule {
}
