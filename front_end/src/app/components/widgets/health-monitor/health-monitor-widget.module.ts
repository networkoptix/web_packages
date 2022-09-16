import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxHealthMonitorWidgetComponent } from './health-monitor-widget.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        CheckboxModule,
        NumericModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [
        NxHealthMonitorWidgetComponent
    ],
    providers: [
        NxHealthMonitorWidgetComponent
    ],
    exports: [
        NxHealthMonitorWidgetComponent
    ]
})

export class HealthMonitorWidgetModule {}
