import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { MonitoringGraphModule } from '@components/graph/graph.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxServerMonitorWidgetComponent } from './server-monitor-widget.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        MonitoringGraphModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [
        NxServerMonitorWidgetComponent
    ],
    providers: [
        NxServerMonitorWidgetComponent
    ],
    exports: [
        NxServerMonitorWidgetComponent
    ]
})

export class ServerMonitorWidgetModule {}
