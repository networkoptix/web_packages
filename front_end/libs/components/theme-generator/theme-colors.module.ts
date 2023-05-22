import { NgModule } from '@angular/core';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';
import { ThemeSwitcherModule } from '@components/theme-switcher/theme-switcher.module';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule,
        ThemeSwitcherModule,
        ContentBlockModule
    ],
    declarations: [
        NxThemeGeneratorComponent,
    ],
    providers: [
        NxThemeGeneratorComponent
    ],
    exports: [
        NxThemeGeneratorComponent
    ]
})

export class NxThemeGeneratorModule { }
