import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { PlayerPlaceholderModule } from '@components/placeholders/player/player-placeholder.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { ComponentsModule } from '../../../../../../components/components.module';

import { components } from './components';

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        CommonModule,
        ComponentsModule,
        TranslateModule,
        PipesModule,
        PlayerPlaceholderModule
    ],
    providers: [] // services,
})
export class VmsClientPlaybackModule {
}
