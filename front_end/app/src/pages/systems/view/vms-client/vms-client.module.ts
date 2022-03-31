import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import PlaybackModule from './submodules/playback/playback.module';
import TimelineModule from './submodules/timeline/timeline.module';
import VmsModule from './submodules/vms/vms.module';

@NgModule({
    declarations: [
    ],
    imports: [
        CommonModule,
        TranslateModule,
        VmsModule,
        PlaybackModule,
        TimelineModule,
    ],
    providers: [
    ],
    exports: [
    ]
})
export class VmsClientModule {
}

export default VmsClientModule;
