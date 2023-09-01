import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPlayerPlaceholderComponent } from '@components/placeholders/player/player-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';

import { components } from './components';

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxPlayerPlaceholderComponent,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
    ],
    providers: [], // services,
})
export class VmsClientPlaybackModule {}
