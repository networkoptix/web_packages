import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { NxLoggerComponent } from '@components/logger/logger.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderNoSettingsComponent } from '@components/placeholdersV2/no-settings/no-settings-page-placeholder.component';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { MenuModule } from '@menu/menu.module';
import { currentSystemResolver } from '@resolvers/current-system-resolver';
import { NxMenuProjectionDirective } from 'nx-components';

import { GraphsComponent } from './graphs/graphs.component';
import { LogsComponent } from './logs/logs.component';
import { NxMonitoringComponent } from './monitoring.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxMonitoringComponent,
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
        resolve: { system: currentSystemResolver },
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'graphs',
            },
            {
                path: 'logs',
                component: LogsComponent,
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'graphs',
                component: GraphsComponent,
                resolve: { system: currentSystemResolver },
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
        NxPreLoaderComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        FormsModule,
        NxMenuProjectionDirective,
        NxPagePlaceholderNoSettingsComponent,
    ],
    providers: [],
    declarations: [NxMonitoringComponent, GraphsComponent, LogsComponent],
    bootstrap: [],
    exports: [NxMonitoringComponent],
})
export class NxMonitoringModule {}
