import { NgModule } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxMonitoringGraphComponent } from './graph.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        ContentBlockModule,
        ContentBlockSectionModule,
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
