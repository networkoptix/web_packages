import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { PipesModule } from '@pipes/pipes.module';

import { NxLanguageDropdown, NxHeaderLanguageDropdown } from './language.component';

@NgModule({
    imports: [
        CommonModule,
        PipesModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxArrowNavDirective,
        NxClickElsewhereDirective,
    ],
    declarations: [NxLanguageDropdown, NxHeaderLanguageDropdown],
    providers: [NxLanguageDropdown, NxHeaderLanguageDropdown],
    exports: [NxLanguageDropdown, NxHeaderLanguageDropdown],
})
export class LanguageModule {}
