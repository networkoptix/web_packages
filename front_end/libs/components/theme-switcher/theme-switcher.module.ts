import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { RadioModule } from '@components/radio/radio.module';

import { ContentBlockModule } from '../content-block/content-block.module';
import { ContentBlockSectionModule } from '../content-block/section/section.module';

import { NxThemeSwitcherComponent } from './theme-switcher.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        ContentBlockSectionModule,
        ContentBlockModule,
        RadioModule,
    ],
    declarations: [NxThemeSwitcherComponent],
    providers: [NxThemeSwitcherComponent],
    exports: [NxThemeSwitcherComponent],
})
export class ThemeSwitcherModule {}
