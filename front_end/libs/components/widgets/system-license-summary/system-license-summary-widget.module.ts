import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { LoggerModule } from '@components/logger/logger.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { LicenseSummaryModule } from '@components/summary/summary.module';

import { NxSystemLicenseSummaryWidget } from './system-license-summary-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        LicenseSummaryModule,
        LoggerModule,
        NumericModule,
        NxGenericDropdownModule,
        PreLoaderModule,
        StepperModule,
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
