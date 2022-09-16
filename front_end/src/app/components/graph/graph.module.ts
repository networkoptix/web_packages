import { NgModule } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';

import { NxMonitoringGraphComponent } from './graph.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        PreLoaderModule,
        SectionPlaceholderModule,
        NgxChartsModule,
    ],
    declarations: [
        NxMonitoringGraphComponent
    ],
    providers: [
        NxMonitoringGraphComponent
    ],
    exports: [
        NxMonitoringGraphComponent
    ]
})

export class MonitoringGraphModule { }
