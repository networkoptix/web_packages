import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxLoggerComponent } from './logger.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        PreLoaderModule,
        SectionPlaceholderModule,
    ],
    declarations: [
        NxLoggerComponent
    ],
    providers: [
        NxLoggerComponent
    ],
    exports: [
        NxLoggerComponent
    ]
})

export class LoggerModule {}
