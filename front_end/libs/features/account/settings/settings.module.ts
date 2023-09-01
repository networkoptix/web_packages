import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { LanguageModule } from '@components/dropdowns/language/language.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxThemeSwitcherComponent } from '@components/theme-switcher/theme-switcher.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxAccountSettingsComponent } from '@pages/account/settings/settings.component';
import { PipesModule } from '@pipes/pipes.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        LanguageModule,
        PipesModule,
        NxPreLoaderComponent,
        NxThemeSwitcherComponent,
        NxAddSvgSrcDirective,
        NxFocusMeDirective,
        NxTooltipDirective,
    ],
    providers: [],
    declarations: [NxAccountSettingsComponent],
    bootstrap: [],
    exports: [NxAccountSettingsComponent],
})
export class NxAccountSettingsModule {}
