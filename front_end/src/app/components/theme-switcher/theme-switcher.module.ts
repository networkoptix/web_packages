import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { RadioModule } from '@components/radio/radio.module';

import { ContentBlockModule } from '../content-block/content-block.module';
import { ContentBlockSectionModule } from '../content-block/section/section.module';

import { NxThemeSwitcherComponent } from './theme-switcher.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        AngularSvgIconModule.forRoot(),
        ContentBlockSectionModule,
        ContentBlockModule,
        RadioModule,
    ],
    declarations: [
        NxThemeSwitcherComponent
    ],
    providers: [
        NxThemeSwitcherComponent
    ],
    exports: [
        NxThemeSwitcherComponent
    ]
})

export class ThemeSwitcherModule {}
