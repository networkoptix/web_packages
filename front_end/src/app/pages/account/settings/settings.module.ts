import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ThemeSwitcherModule } from '@components/theme-switcher/theme-switcher.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountSettingsComponent } from '@pages/account/settings/settings.component';
import { PipesModule } from '@app/pipes/pipes.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        ThemeSwitcherModule,
        ContentBlockModule
    ],
    providers: [],
    declarations: [
        NxAccountSettingsComponent
    ],
    bootstrap: [],
    exports: [
        NxAccountSettingsComponent
    ]
})
export class NxAccountSettingsModule {
}
