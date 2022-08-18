import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { DynamicWidgetModule } from '@components/dynamic-widget/dynamic-widget.module';
import { AssetExplorerWidgetModule } from '@components/widgets/asset-explorer/asset-explorer-widget.module';
import { BookmarksWidgetModule } from '@components/widgets/bookmarks/bookmarks-widget.module';
import { EventGeneratorModule } from '@components/widgets/event-generator/event-generator.module';
import { HealthMonitorWidgetModule } from '@components/widgets/health-monitor/health-monitor-widget.module';
import { LiveViewWidgetModule } from '@components/widgets/live-view/live-view-widget.module';
import { ServerLoggerWidgetModule } from '@components/widgets/server-logger/server-logger-widget.module';
import { ServerMonitorWidgetModule } from '@components/widgets/server-monitor/server-monitor-widget.module';
import { SystemLicenseSummaryModule } from '@components/widgets/system-license-summary/system-license-summary-widget.module';
import { SystemListWidgetModule } from '@components/widgets/systems-list/systems-list-widget.module';
import { ThirdsPartyWidgetModule } from '@components/widgets/third-party/third-party-widget.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxDashboardComponent } from './dashboard.component';

const appRoutes: Routes = [
    { path: '', component: NxDashboardComponent }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes),
        DragDropModule,
        AssetExplorerWidgetModule,
        BookmarksWidgetModule,
        DynamicWidgetModule,
        HealthMonitorWidgetModule,
        LiveViewWidgetModule,
        ServerLoggerWidgetModule,
        ServerMonitorWidgetModule,
        SystemLicenseSummaryModule,
        SystemListWidgetModule,
        ThirdsPartyWidgetModule,
        EventGeneratorModule
    ],
    providers: [],
    declarations: [
        NxDashboardComponent
    ],
    bootstrap: [],
    exports: []
})
export class NxDashboardModule {
}
