import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';

import { NxAccountSettingsDropdown } from './account-settings.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule
    ],
    declarations: [
        NxAccountSettingsDropdown
    ],
    providers: [
        NxAccountSettingsDropdown
    ],
    exports: [
        NxAccountSettingsDropdown
    ]
})

export class AccountSettingsModule {}
