import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';

import { MenuModule } from '../../menu/menu.module';
import { AuthGuard, SystemGuard } from '../../routeGuards';
import { TwofaGuard } from '../../routeGuards/twofaGuard';

import { GraphsComponent } from './graphs/graphs.component';
import { LogsComponent } from './logs/logs.component';
import { NxMonitoringComponent } from './monitoring.component';
import { NxMonitoringService } from './monitoring.service';

const appRoutes: Routes = [
    {
        path: '',
        component: NxMonitoringComponent,
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
        children: [
            {
                path: '',
                component: GraphsComponent,
            },
            {
                path: 'logs',
                component: LogsComponent,
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
        MenuModule,
    ],
    providers: [
        NxMonitoringService,
    ],
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
