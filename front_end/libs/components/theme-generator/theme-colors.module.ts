import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxThemeGeneratorComponent } from '@components/theme-generator/theme-colors.component';
import { ThemeSwitcherModule } from '@components/theme-switcher/theme-switcher.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxCheckboxComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxGenericDropdownModule,
        ThemeSwitcherModule,
    ],
    declarations: [NxThemeGeneratorComponent],
    providers: [NxThemeGeneratorComponent],
    exports: [NxThemeGeneratorComponent],
})
export class NxThemeGeneratorModule {}
