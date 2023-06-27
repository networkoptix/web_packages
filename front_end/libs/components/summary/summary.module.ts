import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxLicenseSummaryComponent } from './summary.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        StepperModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
    ],
    declarations: [NxLicenseSummaryComponent],
    providers: [NxLicenseSummaryComponent],
    exports: [NxLicenseSummaryComponent],
})
export class LicenseSummaryModule {}
