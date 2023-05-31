import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';

import { NxPermissionsDropdown } from './permissions.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        DirectivesModule,
    ],
    declarations: [
        NxPermissionsDropdown
    ],
    providers: [
        NxPermissionsDropdown
    ],
    exports: [
        NxPermissionsDropdown
    ]
})

export class PermissionsModule {}
