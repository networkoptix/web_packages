import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { LanguageModule } from '@components/dropdowns/language/language.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ThemeSwitcherModule } from '@components/theme-switcher/theme-switcher.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountSettingsComponent } from '@pages/account/settings/settings.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        LanguageModule,
        PipesModule,
        NxPreLoaderComponent,
        ThemeSwitcherModule,
    ],
    providers: [],
    declarations: [NxAccountSettingsComponent],
    bootstrap: [],
    exports: [NxAccountSettingsComponent],
})
export class NxAccountSettingsModule {}
