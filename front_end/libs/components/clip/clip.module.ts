import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { VmsClientPlaybackModule } from '@pages/systems/view/vms-client/submodules/playback/playback.module';

import { ComponentsModule } from '../components.module';

import { ClipComponent } from './clip.component';

@NgModule({
    imports: [
        CommonModule,
        VmsClientPlaybackModule,
        ComponentsModule,
        PipesModule
    ],
    declarations: [
        ClipComponent
    ],
    providers: [
    ],
    exports: [
        ClipComponent
    ]
})
export class ClipModule {
}
