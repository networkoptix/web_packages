import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';
import { ThemeSwitcherModule } from '@components/theme-switcher/theme-switcher.module';

@NgModule({
    imports: [
        FormsModule,
        TranslateModule,
        CheckboxModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        NxGenericDropdownModule,
        ThemeSwitcherModule,
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
