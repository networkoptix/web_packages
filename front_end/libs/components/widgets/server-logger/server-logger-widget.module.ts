import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { LoggerModule } from '@components/logger/logger.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxServerLoggerWidgetComponent } from './server-logger-widget.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        LoggerModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [
        NxServerLoggerWidgetComponent
    ],
    providers: [
        NxServerLoggerWidgetComponent
    ],
    exports: [
        NxServerLoggerWidgetComponent
    ]
})

export class ServerLoggerWidgetModule {}
