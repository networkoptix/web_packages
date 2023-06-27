import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { RadioModule } from '@components/radio/radio.module';

import { NxThemeSwitcherComponent } from './theme-switcher.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NxContentBlockSectionComponent,
        NxContentBlockComponent,
        RadioModule,
    ],
    declarations: [NxThemeSwitcherComponent],
    providers: [NxThemeSwitcherComponent],
    exports: [NxThemeSwitcherComponent],
})
export class ThemeSwitcherModule {}
