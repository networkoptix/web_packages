import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxLicenseSummaryComponent } from './summary.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        StepperModule,
        ContentBlockModule,
        ContentBlockSectionModule,
    ],
    declarations: [NxLicenseSummaryComponent],
    providers: [NxLicenseSummaryComponent],
    exports: [NxLicenseSummaryComponent],
})
export class LicenseSummaryModule {}
