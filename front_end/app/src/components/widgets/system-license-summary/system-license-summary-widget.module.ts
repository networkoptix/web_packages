import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { LoggerModule } from '@components/logger/logger.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { LicenseSummaryModule } from '@components/summary/summary.module';

import { NxSystemLicenseSummaryWidget } from './system-license-summary-widget.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        LoggerModule,
        PreLoaderModule,
        StepperModule,
        LicenseSummaryModule,
        NumericModule,
    ],
    declarations: [
        NxSystemLicenseSummaryWidget
    ],
    providers: [
        NxSystemLicenseSummaryWidget
    ],
    exports: [
        NxSystemLicenseSummaryWidget
    ]
})

export class SystemLicenseSummaryModule { }
