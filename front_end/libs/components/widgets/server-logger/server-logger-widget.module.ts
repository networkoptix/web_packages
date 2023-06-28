import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxLoggerComponent } from '@components/logger/logger.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxServerLoggerWidgetComponent } from './server-logger-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        NxLoggerComponent,
        NxGenericDropdownModule,
        NxPreLoaderComponent,
        StepperModule,
    ],
    declarations: [NxServerLoggerWidgetComponent],
    providers: [NxServerLoggerWidgetComponent],
    exports: [NxServerLoggerWidgetComponent],
})
export class ServerLoggerWidgetModule {}
