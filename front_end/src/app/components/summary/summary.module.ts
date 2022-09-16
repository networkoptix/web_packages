import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxLicenseSummaryComponent } from './summary.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        StepperModule,
        ContentBlockModule,
        ContentBlockSectionModule,
    ],
    declarations: [
        NxLicenseSummaryComponent
    ],
    providers: [
        NxLicenseSummaryComponent
    ],
    exports: [
        NxLicenseSummaryComponent
    ]
})

export class LicenseSummaryModule {}
