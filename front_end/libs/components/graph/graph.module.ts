import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';

import { NxMonitoringGraphComponent } from './graph.component';

@NgModule({
    imports: [
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        PreLoaderModule,
        SectionPlaceholderModule,
        NgxChartsModule,
    ],
    declarations: [NxMonitoringGraphComponent],
    providers: [NxMonitoringGraphComponent],
    exports: [NxMonitoringGraphComponent],
})
export class MonitoringGraphModule {}
