import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { VmsClientPlaybackModule } from './submodules/playback/playback.module';
import { VmsClientTimelineModule } from './submodules/timeline/timeline.module';
import { VmsClientVmsModule } from './submodules/vms/vms.module';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        TranslateModule,
        VmsClientVmsModule,
        VmsClientPlaybackModule,
        VmsClientTimelineModule,
    ],
    providers: [],
    exports: [],
})
export class VmsClientModule {}
