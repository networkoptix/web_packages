import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxDynamicWidgetComponent } from '@components/dynamic-widget/dynamic-widget.component';
import { EditableModule } from '@components/editable/editable.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxAssetExplorerWidgetComponent } from '@components/widgets/asset-explorer/asset-explorer-widget.component';
import { NxEventGeneratorWidgetComponent } from '@components/widgets/event-generator/event-generator.component';
import { NxHealthMonitorWidgetComponent } from '@components/widgets/health-monitor/health-monitor-widget.component';
import { NxLiveViewWidgetComponent } from '@components/widgets/live-view/live-view-widget.component';
import { NxServerLoggerWidgetComponent } from '@components/widgets/server-logger/server-logger-widget.component';
import { NxServerMonitorWidgetComponent } from '@components/widgets/server-monitor/server-monitor-widget.component';
import { NxSystemLicenseSummaryWidget } from '@components/widgets/system-license-summary/system-license-summary-widget.component';
import { NxSystemsListWidgetComponent } from '@components/widgets/systems-list/systems-list-widget.component';
import { NxThirdPartyWidgetComponent } from '@components/widgets/third-party/third-party-widget.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { PipesModule } from '@pipes/pipes.module';

import { NxDashboardComponent } from './dashboard.component';

const appRoutes: Routes = [{ path: '', component: NxDashboardComponent }];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DragDropModule,
        EditableModule,
        NxGenericDropdownModule,
        PipesModule,
        NxPreLoaderComponent,
        NxSwitchComponent,
        NxAssetExplorerWidgetComponent,
        // BookmarksWidgetModule,
        NxDynamicWidgetComponent,
        NxHealthMonitorWidgetComponent,
        NxLiveViewWidgetComponent,
        NxServerLoggerWidgetComponent,
        NxServerMonitorWidgetComponent,
        NxSystemLicenseSummaryWidget,
        NxSystemsListWidgetComponent,
        NxThirdPartyWidgetComponent,
        NxEventGeneratorWidgetComponent,
        NxAddSvgSrcDirective,
        NxClickElsewhereDirective,
        NxTooltipDirective,
    ],
    providers: [],
    declarations: [NxDashboardComponent],
    bootstrap: [],
    exports: [],
})
export class NxDashboardModule {}
