import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@pipes/pipes.module';

import { NxInfoBlockComponent } from './info-block.component';

@NgModule({
    imports: [CommonModule, TranslateModule, AngularSvgIconModule, PipesModule],
    declarations: [NxInfoBlockComponent],
    providers: [NxInfoBlockComponent],
    exports: [NxInfoBlockComponent],
})
export class InfoBlockModule {}
