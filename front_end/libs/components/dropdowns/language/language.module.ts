import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxLanguageDropdown, NxHeaderLanguageDropdown } from './language.component';

@NgModule({
    imports: [CommonModule, PipesModule, AngularSvgIconModule, DirectivesModule],
    declarations: [NxLanguageDropdown, NxHeaderLanguageDropdown],
    providers: [NxLanguageDropdown, NxHeaderLanguageDropdown],
    exports: [NxLanguageDropdown, NxHeaderLanguageDropdown],
})
export class LanguageModule {}
