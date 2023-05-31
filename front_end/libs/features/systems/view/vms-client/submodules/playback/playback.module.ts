import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { PlayerPlaceholderModule } from '@components/placeholders/player/player-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { components } from './components';

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        PlayerPlaceholderModule,
        PreLoaderModule,
    ],
    providers: [] // services,
})
export class VmsClientPlaybackModule {
}
