import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';

import { NxLoggerComponent } from './logger.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxGenericDropdownModule,
        PreLoaderModule,
        SectionPlaceholderModule,
    ],
    declarations: [NxLoggerComponent],
    providers: [NxLoggerComponent],
    exports: [NxLoggerComponent],
})
export class LoggerModule {}
