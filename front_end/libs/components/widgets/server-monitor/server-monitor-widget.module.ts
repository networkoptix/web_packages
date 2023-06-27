import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxServerMonitorWidgetComponent } from './server-monitor-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        NxMonitoringGraphComponent,
        NxGenericDropdownModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [NxServerMonitorWidgetComponent],
    providers: [NxServerMonitorWidgetComponent],
    exports: [NxServerMonitorWidgetComponent],
})
export class ServerMonitorWidgetModule {}
